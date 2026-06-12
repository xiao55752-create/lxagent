import type { InitiationProject, IntegrationPush } from '../types.js'
import { getIntegrationConfig } from './integrationConfig.js'

function uid() {
  return `push_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function buildJiraPayload(project: InitiationProject) {
  const cfg = getIntegrationConfig()
  const suffix = project.projectNo.replace(/\D/g, '').slice(-4) || project.id.slice(0, 4).toUpperCase()
  const key = `${cfg.jiraProjectKey}-${suffix}`
  const base = cfg.jiraBaseUrl.replace(/\/$/, '')
  return {
    externalId: key,
    url: `${base}/browse/${key}`,
    summary: `[立项归档] ${project.title}（${project.projectNo}）`,
    description: `提出人：${project.proposer}\n部门：${project.department}\n预算：${project.budgetRange}\n材料数：${project.materials.length}`,
  }
}

function buildFeishuPayload(project: InitiationProject) {
  const cfg = getIntegrationConfig()
  const taskId = `fs_${project.id.slice(0, 8)}`
  const base = cfg.feishuBaseUrl.replace(/\/$/, '')
  return {
    externalId: taskId,
    url: `${base}/${cfg.feishuProjectId}/task/${taskId}`,
    summary: `立项执行 · ${project.title}`,
    description: `项目编号 ${project.projectNo} 已通过三级审批并归档，请创建执行任务。`,
  }
}

async function sendWebhook(
  target: 'jira' | 'feishu',
  project: InitiationProject,
  payload: { externalId: string; url: string; summary: string; description: string },
): Promise<{ sent: boolean; error?: string }> {
  const cfg = getIntegrationConfig()
  if (!cfg.webhookEnabled) return { sent: false }

  const url = target === 'jira' ? cfg.jiraWebhookUrl : cfg.feishuWebhookUrl
  if (!url?.trim()) return { sent: false }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'initiation.archived',
        target,
        projectId: project.id,
        projectNo: project.projectNo,
        title: project.title,
        department: project.department,
        proposer: project.proposer,
        budgetRange: project.budgetRange,
        materialCount: project.materials.length,
        externalId: payload.externalId,
        url: payload.url,
        summary: payload.summary,
        description: payload.description,
        pushedAt: new Date().toISOString(),
      }),
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) {
      return { sent: false, error: `HTTP ${res.status}` }
    }
    return { sent: true }
  } catch (e) {
    return { sent: false, error: String(e) }
  }
}

export async function pushToIntegration(
  project: InitiationProject,
  target: 'jira' | 'feishu',
): Promise<IntegrationPush & { webhookSent?: boolean; webhookError?: string }> {
  const payload = target === 'jira' ? buildJiraPayload(project) : buildFeishuPayload(project)
  const webhook = await sendWebhook(target, project, payload)

  const push: IntegrationPush = {
    id: uid(),
    target,
    status: 'success',
    externalId: payload.externalId,
    url: payload.url,
    summary: payload.summary,
    pushedAt: new Date().toISOString(),
  }

  return {
    ...push,
    webhookSent: webhook.sent,
    webhookError: webhook.error,
  }
}
