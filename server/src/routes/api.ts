import { Router } from 'express'
import { knowledgeBase } from '../kb/index.js'
import { generateReport, askAssistant, generateApprovalViews } from '../agents/reports.js'
import { initiationService } from '../services/initiationService.js'
import { isLlmConfigured } from '../llm/client.js'
import type { KbType } from '../types.js'

export const apiRouter = Router()

function handleError(res: import('express').Response, e: unknown) {
  const msg = String(e)
  if (msg.includes('NOT_FOUND')) return res.status(404).json({ error: '未找到' })
  if (msg.includes('READONLY')) return res.status(403).json({ error: '当前状态不可编辑' })
  if (msg.includes('COMPLIANCE')) return res.status(400).json({ error: msg.replace('Error: COMPLIANCE: ', '') })
  if (msg.includes('NO_PLAN')) return res.status(400).json({ error: '暂无执行计划' })
  if (msg.includes('PHASE_MISMATCH')) return res.status(400).json({ error: '当前阶段与计划步骤不匹配，请先完成前置步骤' })
  if (msg.includes('MISSING_FIELDS')) return res.status(400).json({ error: '信息尚未采集完整，无法执行该步骤' })
  if (msg.includes('INVALID_STEP')) return res.status(400).json({ error: '无效的 plan 步骤' })
  if (msg.includes('NO_SNAPSHOT')) return res.status(400).json({ error: '没有可撤销的操作' })
  return res.status(500).json({ error: msg })
}

apiRouter.get('/health', (_req, res) => {
  res.json({
    ok: true,
    llmConfigured: isLlmConfigured(),
    kb: knowledgeBase.getStats(),
  })
})

apiRouter.get('/config/approval-roles', (_req, res) => {
  res.json({ config: initiationService.getApprovalRolesConfig() })
})

apiRouter.put('/config/approval-roles', (req, res) => {
  try {
    const config = initiationService.updateApprovalRolesConfig(req.body)
    res.json({ config })
  } catch (e) {
    handleError(res, e)
  }
})

apiRouter.get('/config/integrations', (_req, res) => {
  res.json({ config: initiationService.getIntegrationConfig() })
})

apiRouter.put('/config/integrations', (req, res) => {
  try {
    const config = initiationService.updateIntegrationConfig(req.body)
    res.json({ config })
  } catch (e) {
    handleError(res, e)
  }
})

// --- Initiations (立项单) ---

apiRouter.get('/initiations', (_req, res) => {
  res.json({ items: initiationService.list() })
})

apiRouter.get('/analytics/approval', (_req, res) => {
  res.json({ analytics: initiationService.getApprovalAnalytics() })
})

apiRouter.get('/analytics/integrations', (_req, res) => {
  res.json({ analytics: initiationService.getIntegrationAnalytics() })
})

apiRouter.get('/initiations/:id/similar-cases', (req, res) => {
  try {
    const cases = initiationService.getSimilarCases(req.params.id)
    res.json({ cases })
  } catch (e) {
    handleError(res, e)
  }
})

apiRouter.get('/initiations/:id/context-rules', (req, res) => {
  try {
    const rules = initiationService.getContextRules(req.params.id)
    res.json({ rules })
  } catch (e) {
    handleError(res, e)
  }
})

apiRouter.post('/initiations/:id/push-integration', async (req, res) => {
  try {
    const target = req.body.target as 'jira' | 'feishu'
    if (!target || !['jira', 'feishu'].includes(target)) {
      return res.status(400).json({ error: 'target 须为 jira 或 feishu' })
    }
    const project = await initiationService.pushIntegration(req.params.id, target)
    res.json({ project })
  } catch (e) {
    handleError(res, e)
  }
})

apiRouter.post('/initiations', (_req, res) => {
  const project = initiationService.create()
  res.json({ project })
})

apiRouter.get('/initiations/:id', (req, res) => {
  const project = initiationService.get(req.params.id)
  if (!project) return res.status(404).json({ error: '未找到' })
  res.json({ project })
})

apiRouter.post('/initiations/:id/chat', async (req, res) => {
  try {
    const project = await initiationService.chat(req.params.id, req.body.message)
    res.json({ project })
  } catch (e) {
    handleError(res, e)
  }
})

apiRouter.post('/initiations/:id/autonomy', (req, res) => {
  try {
    const project = initiationService.setAutonomy(req.params.id, req.body.level)
    res.json({ project })
  } catch (e) {
    handleError(res, e)
  }
})

apiRouter.post('/initiations/:id/focus', (req, res) => {
  try {
    const project = initiationService.setFocus(req.params.id, req.body.phaseId ?? null)
    res.json({ project })
  } catch (e) {
    handleError(res, e)
  }
})

apiRouter.post('/initiations/:id/execute-plan', async (req, res) => {
  try {
    const project = await initiationService.executePlan(req.params.id)
    res.json({ project })
  } catch (e) {
    handleError(res, e)
  }
})

apiRouter.post('/initiations/:id/execute-plan-step', async (req, res) => {
  try {
    const project = await initiationService.executePlanStep(req.params.id, req.body.stepId)
    res.json({ project })
  } catch (e) {
    handleError(res, e)
  }
})

apiRouter.post('/initiations/:id/skip-plan-step', (req, res) => {
  try {
    const project = initiationService.skipPlanStep(req.params.id, req.body.stepId)
    res.json({ project })
  } catch (e) {
    handleError(res, e)
  }
})

apiRouter.post('/initiations/:id/dismiss-plan', (req, res) => {
  try {
    const project = initiationService.dismissPlan(req.params.id)
    res.json({ project })
  } catch (e) {
    handleError(res, e)
  }
})

apiRouter.post('/initiations/:id/rollback', (req, res) => {
  try {
    const project = initiationService.rollback(req.params.id)
    res.json({ project })
  } catch (e) {
    handleError(res, e)
  }
})

apiRouter.post('/initiations/:id/answer', async (req, res) => {
  try {
    const project = await initiationService.submitAnswer(req.params.id, req.body.answer)
    res.json({ project })
  } catch (e) {
    handleError(res, e)
  }
})

apiRouter.post('/initiations/:id/advance', async (req, res) => {
  try {
    const project = await initiationService.advanceAfterConfirm(req.params.id)
    res.json({ project })
  } catch (e) {
    handleError(res, e)
  }
})

apiRouter.post('/initiations/:id/confirm-material', async (req, res) => {
  try {
    const project = await initiationService.confirmMaterial(req.params.id, req.body.materialType)
    res.json({ project })
  } catch (e) {
    handleError(res, e)
  }
})

apiRouter.post('/initiations/:id/prepare-approval', async (req, res) => {
  try {
    const project = await initiationService.prepareApproval(req.params.id)
    res.json({ project })
  } catch (e) {
    handleError(res, e)
  }
})

apiRouter.post('/initiations/:id/assess-go-nogo', async (req, res) => {
  try {
    const project = await initiationService.assessGoNoGo(req.params.id)
    res.json({ project })
  } catch (e) {
    handleError(res, e)
  }
})

apiRouter.post('/initiations/:id/submit', async (req, res) => {
  try {
    const project = await initiationService.submitForApproval(req.params.id)
    res.json({ project })
  } catch (e) {
    handleError(res, e)
  }
})

apiRouter.post('/initiations/:id/approve', (req, res) => {
  try {
    const { level, decision, opinion, conditions } = req.body
    const project = initiationService.processApproval(
      req.params.id,
      level,
      decision,
      opinion || '',
      conditions || [],
    )
    res.json({ project })
  } catch (e) {
    handleError(res, e)
  }
})

apiRouter.post('/initiations/:id/ask', async (req, res) => {
  try {
    const project = await initiationService.ask(req.params.id, req.body.question)
    res.json({ project })
  } catch (e) {
    handleError(res, e)
  }
})

apiRouter.get('/initiations/:id/compliance', (req, res) => {
  try {
    const project = initiationService.compliance(req.params.id)
    res.json({ project })
  } catch (e) {
    handleError(res, e)
  }
})

// --- Knowledge Base ---

apiRouter.get('/kb/documents', (_req, res) => {
  res.json({ documents: knowledgeBase.listDocuments(), stats: knowledgeBase.getStats() })
})

apiRouter.get('/kb/documents/:id', (req, res) => {
  const doc = knowledgeBase.getDocument(req.params.id)
  if (!doc) return res.status(404).json({ error: '文档未找到' })
  res.json({ document: doc })
})

apiRouter.get('/kb/search', (req, res) => {
  const q = String(req.query.q || '')
  const kbType = req.query.kbType as KbType | undefined
  if (!q) return res.status(400).json({ error: 'q is required' })
  const results = knowledgeBase.search(q, {
    kbTypes: kbType ? [kbType] : undefined,
    limit: Number(req.query.limit || 8),
  })
  res.json({ results })
})

apiRouter.post('/kb/documents', (req, res) => {
  const { title, kbType, content, metadata } = req.body
  if (!title || !kbType || !content) {
    return res.status(400).json({ error: 'title, kbType, content required' })
  }
  const doc = knowledgeBase.addDocument({ title, kbType, content, metadata })
  res.json({ document: doc })
})

// --- Legacy report endpoints ---

apiRouter.post('/reports/generate', async (req, res) => {
  try {
    const result = await generateReport(req.body)
    res.json(result)
  } catch (e) {
    res.status(500).json({ error: String(e) })
  }
})

apiRouter.post('/assistant/ask', async (req, res) => {
  try {
    const { question, projectContext } = req.body
    if (!question) return res.status(400).json({ error: 'question required' })
    const result = await askAssistant(question, projectContext)
    res.json(result)
  } catch (e) {
    res.status(500).json({ error: String(e) })
  }
})

apiRouter.post('/approval/views', (req, res) => {
  const { name, proposer } = req.body
  res.json(generateApprovalViews({ name: name || '未命名项目', proposer: proposer || '未知' }))
})
