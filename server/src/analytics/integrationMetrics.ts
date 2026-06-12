import type { InitiationProject } from '../types.js'
import { listWebhookLogs, type WebhookLogEntry } from '../integrations/webhookLog.js'

export interface IntegrationPushSummary {
  projectId: string
  projectNo: string
  projectTitle: string
  target: 'jira' | 'feishu'
  externalId: string
  url: string
  summary: string
  status: 'success' | 'failed'
  pushedAt: string
}

export interface IntegrationAnalytics {
  generatedAt: string
  totals: {
    pushes: number
    jira: number
    feishu: number
    webhookSuccess: number
    webhookFailed: number
  }
  recentPushes: IntegrationPushSummary[]
  webhookLogs: WebhookLogEntry[]
}

export function buildIntegrationAnalytics(projects: InitiationProject[]): IntegrationAnalytics {
  const pushes: IntegrationPushSummary[] = []

  for (const p of projects) {
    for (const push of p.integrationPushes || []) {
      pushes.push({
        projectId: p.id,
        projectNo: p.projectNo,
        projectTitle: p.title,
        target: push.target,
        externalId: push.externalId,
        url: push.url,
        summary: push.summary,
        status: push.status,
        pushedAt: push.pushedAt,
      })
    }
  }

  pushes.sort((a, b) => b.pushedAt.localeCompare(a.pushedAt))

  const webhookLogs = listWebhookLogs(20)
  const webhookSuccess = webhookLogs.filter((l) => l.webhookSent).length
  const webhookFailed = webhookLogs.filter((l) => !l.webhookSent && l.webhookError).length

  return {
    generatedAt: new Date().toISOString(),
    totals: {
      pushes: pushes.length,
      jira: pushes.filter((p) => p.target === 'jira').length,
      feishu: pushes.filter((p) => p.target === 'feishu').length,
      webhookSuccess,
      webhookFailed,
    },
    recentPushes: pushes.slice(0, 15),
    webhookLogs,
  }
}
