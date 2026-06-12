import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'fs'
import { join } from 'path'
import { randomUUID } from 'crypto'
import { INITIATIONS_DIR } from '../config.js'
import { generateReport, generateApprovalViews, askAssistant } from '../agents/reports.js'
import { buildAgentReply, extractWithLlm } from '../agents/orchestrator.js'
import { buildAgentPlan } from '../agents/planner.js'
import {
  PHASES,
  initialPhaseStatuses,
  REPORT_PHASES,
} from '../workflow/phases.js'
import {
  getMissingFields,
  isRuleQuestion,
  WELCOME_MESSAGE,
  FIELD_LABELS,
} from '../workflow/fieldExtract.js'
import {
  runComplianceCheck,
  allMaterialsConfirmed,
  getLatestMaterial,
  lockAllMaterials,
  isCollectingAllowed,
  isReadonly,
  buildApprovalPreview,
} from '../workflow/compliance.js'
import {
  syncPhaseStatuses,
  updateProjectReadiness,
  getExecutionOrder,
  isModuleReady,
  isModuleComplete,
} from '../workflow/modules.js'
import { buildGoNoGoAssessment } from '../agents/goNoGo.js'
import { buildMaterialProvenance } from '../workflow/provenance.js'
import { findSimilarCases } from '../agents/similarCases.js'
import { buildApprovalAnalytics } from '../analytics/approvalMetrics.js'
import { formatApproverLabel, getApprovalRoles, saveApprovalRoles, type ApprovalRolesConfig } from '../workflow/approvalConfig.js'
import { getContextRulesForPhase } from '../agents/contextRules.js'
import { pushToIntegration } from '../integrations/pushTargets.js'
import { appendWebhookLog } from '../integrations/webhookLog.js'
import { buildIntegrationAnalytics } from '../analytics/integrationMetrics.js'
import { getIntegrationConfig as readIntegrationConfig, saveIntegrationConfig, type IntegrationConfig } from '../integrations/integrationConfig.js'
import { knowledgeBase } from '../kb/index.js'
import type {
  InitiationProject,
  InitiationStatus,
  Material,
  ApprovalRecord,
  ChatMessage,
  AgentAction,
  AgentSnapshot,
  AutonomyLevel,
  PhaseId,
} from '../types.js'

interface ExecutionResult {
  autoCompletedPhases: string[]
  justGeneratedMaterial?: string
  actions: AgentAction[]
}

interface ExecutionOpts {
  autoConfirm: boolean
  silent: boolean
  maxSteps?: number
}

function uid() {
  return randomUUID()
}

function now() {
  return new Date().toISOString()
}

function msg(role: ChatMessage['role'], content: string, actions?: AgentAction[]): ChatMessage {
  return { id: uid(), role, content, timestamp: Date.now(), actions }
}

function projectPath(id: string) {
  return join(INITIATIONS_DIR, `${id}.json`)
}

function reportsMap(project: InitiationProject): Record<string, string> {
  const map: Record<string, string> = {}
  for (const m of project.materials) {
    if (REPORT_PHASES.includes(m.materialType)) {
      map[m.materialType] = m.content
    }
  }
  return map
}

function upsertMaterial(
  project: InitiationProject,
  type: string,
  title: string,
  content: string,
  sourceDocIds: string[],
): Material {
  const existing = getLatestMaterial(project, type)
  const provenance = buildMaterialProvenance(project, type, sourceDocIds)
  const material: Material = {
    id: uid(),
    materialType: type,
    title,
    content,
    version: existing ? existing.version + 1 : 1,
    status: 'draft',
    sourceDocIds,
    provenance,
    generatedBy: 'ai',
    createdAt: now(),
  }
  project.materials.push(material)
  return material
}

function syncMetaFromAnswers(project: InitiationProject) {
  const a = project.answers
  if (a.project_name) project.title = a.project_name
  if (a.proposer) {
    project.proposer = a.proposer.split('-')[1]?.trim() || a.proposer
    project.department = a.proposer.split('-')[0]?.trim() || project.department
  }
  if (a.project_type) project.projectType = a.project_type
  if (a.expected_start) project.expectedStart = a.expected_start
  if (a.duration) project.duration = a.duration
  if (a.budget_range) project.budgetRange = a.budget_range
}

const MAX_SNAPSHOTS = 8

function cloneSnapshot(project: InitiationProject, label: string): AgentSnapshot {
  return {
    id: uid(),
    label,
    createdAt: Date.now(),
    currentPhase: project.currentPhase,
    focusPhase: project.focusPhase ?? null,
    phaseStatuses: { ...project.phaseStatuses },
    answers: { ...project.answers },
    materials: JSON.parse(JSON.stringify(project.materials)),
    agentPlan: project.agentPlan ? JSON.parse(JSON.stringify(project.agentPlan)) : null,
    status: project.status,
    title: project.title,
    proposer: project.proposer,
    department: project.department,
    projectType: project.projectType,
    budgetRange: project.budgetRange,
    currentNode: project.currentNode,
  }
}

function pushSnapshot(project: InitiationProject, label: string) {
  if (!project.agentSnapshots) project.agentSnapshots = []
  project.agentSnapshots.push(cloneSnapshot(project, label))
  while (project.agentSnapshots.length > MAX_SNAPSHOTS) {
    project.agentSnapshots.shift()
  }
}

function applySnapshot(project: InitiationProject, snap: AgentSnapshot) {
  project.currentPhase = snap.currentPhase
  project.focusPhase = snap.focusPhase ?? null
  project.phaseStatuses = { ...snap.phaseStatuses }
  project.answers = { ...snap.answers }
  project.materials = JSON.parse(JSON.stringify(snap.materials))
  project.agentPlan = snap.agentPlan ? JSON.parse(JSON.stringify(snap.agentPlan)) : null
  project.status = snap.status
  project.title = snap.title
  project.proposer = snap.proposer
  project.department = snap.department
  project.projectType = snap.projectType
  project.budgetRange = snap.budgetRange
  project.currentNode = snap.currentNode
}

function createEmpty(): InitiationProject {
  const id = uid()
  const num = String(Math.floor(Math.random() * 900) + 100)
  return {
    id,
    projectNo: `PRJ-2026-${num}`,
    title: '未命名项目',
    status: 'draft',
    currentNode: 'create',
    version: 1,
    proposer: '',
    department: '',
    projectType: '',
    expectedStart: '',
    duration: '',
    budgetRange: '',
    approvalLevel: 0,
    finalDecision: 'pending',
    currentPhase: 'setup',
    focusPhase: null,
    phaseStatuses: initialPhaseStatuses(),
    currentQuestionIndex: 0,
    answers: {},
    materials: [],
    messages: [msg('agent', WELCOME_MESSAGE)],
    approvals: [],
    ruleRefs: [],
    complianceWarnings: [],
    validationWarnings: [],
    agentTask: null,
    autonomyLevel: 'execute',
    agentPlan: null,
    agentSnapshots: [],
    createdAt: now(),
    updatedAt: now(),
  }
}

export class InitiationService {
  ensureDir() {
    if (!existsSync(INITIATIONS_DIR)) mkdirSync(INITIATIONS_DIR, { recursive: true })
  }

  save(project: InitiationProject) {
    this.ensureDir()
    project.updatedAt = now()
    writeFileSync(projectPath(project.id), JSON.stringify(project, null, 2))
  }

  get(id: string): InitiationProject | null {
    const p = projectPath(id)
    if (!existsSync(p)) return null
    const project = JSON.parse(readFileSync(p, 'utf-8')) as InitiationProject
    if (!project.agentSnapshots) project.agentSnapshots = []
    if (project.focusPhase === undefined) project.focusPhase = null
    if (project.approvalPreview && !('matrix' in project.approvalPreview)) {
      project.approvalPreview = null
    }
    syncPhaseStatuses(project)
    return project
  }

  list(): InitiationProject[] {
    this.ensureDir()
    return readdirSync(INITIATIONS_DIR)
      .filter((f) => f.endsWith('.json'))
      .map((f) => JSON.parse(readFileSync(join(INITIATIONS_DIR, f), 'utf-8')))
      .sort((a: InitiationProject, b: InitiationProject) => b.updatedAt.localeCompare(a.updatedAt))
  }

  getApprovalAnalytics() {
    return buildApprovalAnalytics(this.list())
  }

  getIntegrationAnalytics() {
    return buildIntegrationAnalytics(this.list())
  }

  getSimilarCases(id: string) {
    const project = this.get(id)
    if (!project) throw new Error('NOT_FOUND')
    return findSimilarCases(project, this.list())
  }

  create(): InitiationProject {
    const project = createEmpty()
    project.status = 'collecting'
    project.currentNode = 'collect_basic'
    this.save(project)
    return project
  }

  async chat(id: string, message: string): Promise<InitiationProject> {
    const project = this.get(id)
    if (!project) throw new Error('NOT_FOUND')

    project.messages.push(msg('user', message))

    if (isReadonly(project.status)) {
      const { answer, sources } = await askAssistant(message, {
        meta: { name: project.title, projectType: project.projectType, proposer: project.proposer },
        answers: project.answers,
        phase: project.currentPhase,
      })
      for (const s of sources) {
        if (!project.ruleRefs.includes(s.docId)) project.ruleRefs.push(s.docId)
      }
      const actions: AgentAction[] = sources.map((s) => ({
        type: 'evidence',
        label: s.title,
        detail: s.content.slice(0, 120),
        meta: { docId: s.docId, kbType: s.kbType },
      }))
      project.messages.push(msg('agent', answer, actions.length ? actions : undefined))
      this.save(project)
      return project
    }

    if (!isCollectingAllowed(project.status)) throw new Error('READONLY')
    if (project.status === 'draft') project.status = 'collecting'

    if (isRuleQuestion(message) && getMissingFields(project.currentPhase, project.answers).length === 0) {
      const { answer, sources } = await askAssistant(message, {
        meta: { name: project.title, projectType: project.projectType, proposer: project.proposer },
        answers: project.answers,
        phase: project.currentPhase,
      })
      for (const s of sources) {
        if (!project.ruleRefs.includes(s.docId)) project.ruleRefs.push(s.docId)
      }
      const actions: AgentAction[] = sources.map((s) => ({
        type: 'evidence',
        label: s.title,
        detail: s.content.slice(0, 120),
        meta: { docId: s.docId, kbType: s.kbType },
      }))
      project.messages.push(msg('agent', answer, actions.length ? actions : undefined))
      this.save(project)
      return project
    }

    const answersBefore = { ...project.answers }
    project.answers = await extractWithLlm(message, project.answers)
    syncMetaFromAnswers(project)
    syncPhaseStatuses(project)

    const actions: AgentAction[] = []
    for (const key of Object.keys(project.answers)) {
      if (project.answers[key]?.trim() && project.answers[key] !== answersBefore[key]) {
        actions.push({
          type: 'extract',
          label: FIELD_LABELS[key] || key,
          detail: project.answers[key].slice(0, 80),
          meta: { field: key },
        })
      }
    }

    const autoCompletedPhases: string[] = []
    let justGeneratedMaterial: string | undefined
    const autonomy: AutonomyLevel = project.autonomyLevel || 'execute'

    if (autonomy === 'suggest') {
      const planSteps = buildAgentPlan(project)
      if (planSteps.length > 0) {
        project.agentPlan = { steps: planSteps, createdAt: Date.now() }
        actions.push({
          type: 'plan',
          label: `执行计划已就绪（${planSteps.length} 步）`,
          detail: planSteps.map((s) => s.title).join(' → '),
        })
      } else {
        project.agentPlan = null
      }
    } else {
      const autoConfirm = autonomy === 'execute'
      pushSnapshot(project, '智能体自动执行')
      const exec = await this.runAgentExecution(project, { autoConfirm, silent: true })
      autoCompletedPhases.push(...exec.autoCompletedPhases)
      justGeneratedMaterial = exec.justGeneratedMaterial
      actions.push(...exec.actions)
      project.agentPlan = null
    }

    project.agentTask = null
    const reply = await buildAgentReply(project, message, autoCompletedPhases, justGeneratedMaterial)
    if (autonomy === 'suggest' && project.agentPlan) {
      const planHint = `\n\n📋 我已准备好 ${project.agentPlan.steps.length} 步执行计划，请在下方面板确认后执行。`
      project.messages.push(msg('agent', reply + planHint, actions.length ? actions : undefined))
    } else {
      project.messages.push(msg('agent', reply, actions.length ? actions : undefined))
    }

    await this.maybeRefreshGoNoGo(project)
    this.save(project)
    return project
  }

  async assessGoNoGo(id: string): Promise<InitiationProject> {
    const project = this.get(id)
    if (!project) throw new Error('NOT_FOUND')
    project.goNoGoAssessment = await buildGoNoGoAssessment(project)
    this.save(project)
    return project
  }

  private async maybeRefreshGoNoGo(project: InitiationProject) {
    const filled = Object.values(project.answers).filter((v) => v?.trim()).length
    if (filled >= 2 || project.materials.length > 0) {
      project.goNoGoAssessment = await buildGoNoGoAssessment(project)
    }
  }

  async runAgentExecution(
    project: InitiationProject,
    opts: ExecutionOpts,
  ): Promise<ExecutionResult> {
    const actions: AgentAction[] = []
    const autoCompletedPhases: string[] = []
    let justGeneratedMaterial: string | undefined
    let iterations = 0
    const limit = opts.maxSteps ?? 12
    const order = getExecutionOrder(project)

    for (const phaseId of order) {
      if (iterations >= limit) break

      project.currentPhase = phaseId
      project.agentTask = `正在执行：${PHASES.find((p) => p.id === phaseId)?.title || phaseId}`

      if (project.agentPlan) {
        const step = project.agentPlan.steps.find(
          (s) => s.phaseId === phaseId && (s.status === 'pending' || s.status === 'running'),
        )
        if (step?.status === 'skipped') continue
        if (step?.status === 'pending') step.status = 'running'
      }

      const updated = await this.completeModule(project, phaseId, {
        silent: opts.silent,
        autoConfirm: opts.autoConfirm,
      })
      Object.assign(project, updated)

      if (project.phaseStatuses[phaseId] === 'completed') {
        autoCompletedPhases.push(phaseId)
        const phaseDef = PHASES.find((p) => p.id === phaseId)
        if (phaseDef?.reportTitle) {
          justGeneratedMaterial = phaseDef.reportTitle
          actions.push({
            type: 'material',
            label: `生成《${phaseDef.reportTitle}》`,
            meta: { materialType: phaseDef.reportKey || phaseId },
          })
        } else {
          actions.push({
            type: 'phase',
            label: `${phaseDef?.title || phaseId} 已完成`,
          })
        }
        if (project.agentPlan) {
          const step = project.agentPlan.steps.find((s) => s.phaseId === phaseId)
          if (step) step.status = 'done'
        }
      }

      iterations++
    }

    syncPhaseStatuses(project)
    updateProjectReadiness(project)
    project.agentTask = null
    return { autoCompletedPhases, justGeneratedMaterial, actions }
  }

  setFocus(id: string, phaseId: PhaseId | null): InitiationProject {
    const project = this.get(id)
    if (!project) throw new Error('NOT_FOUND')
    if (isReadonly(project.status)) throw new Error('READONLY')
    project.focusPhase = phaseId
    if (phaseId) project.currentPhase = phaseId
    this.save(project)
    return project
  }

  setAutonomy(id: string, level: AutonomyLevel): InitiationProject {
    const project = this.get(id)
    if (!project) throw new Error('NOT_FOUND')
    if (isReadonly(project.status)) throw new Error('READONLY')
    project.autonomyLevel = level
    if (level !== 'suggest') project.agentPlan = null
    this.save(project)
    return project
  }

  async executePlanStep(id: string, stepId: string): Promise<InitiationProject> {
    const project = this.get(id)
    if (!project) throw new Error('NOT_FOUND')
    if (!project.agentPlan) throw new Error('NO_PLAN')
    if (isReadonly(project.status)) throw new Error('READONLY')

    const step = project.agentPlan.steps.find((s) => s.id === stepId)
    if (!step || step.status !== 'pending') throw new Error('INVALID_STEP')
    if (!isModuleReady(project, step.phaseId)) throw new Error('MISSING_FIELDS')
    if (isModuleComplete(project, step.phaseId)) throw new Error('INVALID_STEP')

    const autonomy = project.autonomyLevel || 'execute'
    const autoConfirm = autonomy === 'execute'

    pushSnapshot(project, `执行步骤：${step.title}`)
    step.status = 'running'
    project.focusPhase = step.phaseId
    project.currentPhase = step.phaseId

    const exec = await this.runAgentExecution(project, { autoConfirm, silent: true, maxSteps: 1 })
    step.status = 'done'

    if (project.agentPlan.steps.every((s) => s.status === 'done' || s.status === 'skipped')) {
      project.agentPlan = null
    }

    const reply = await buildAgentReply(
      project,
      `执行步骤：${step.title}`,
      exec.autoCompletedPhases,
      exec.justGeneratedMaterial,
    )
    project.messages.push(msg('agent', reply, exec.actions.length ? exec.actions : undefined))
    this.save(project)
    return project
  }

  skipPlanStep(id: string, stepId: string): InitiationProject {
    const project = this.get(id)
    if (!project) throw new Error('NOT_FOUND')
    if (!project.agentPlan) throw new Error('NO_PLAN')

    const step = project.agentPlan.steps.find((s) => s.id === stepId)
    if (!step || step.status !== 'pending') throw new Error('INVALID_STEP')

    step.status = 'skipped'
    project.messages.push(
      msg('system', `⏭ 已跳过计划步骤：${step.title}。你可稍后通过对话手动完成该阶段。`),
    )

    if (project.agentPlan.steps.every((s) => s.status === 'done' || s.status === 'skipped')) {
      project.agentPlan = null
    }

    this.save(project)
    return project
  }

  async executePlan(id: string): Promise<InitiationProject> {
    const project = this.get(id)
    if (!project) throw new Error('NOT_FOUND')
    if (!project.agentPlan?.steps.length) throw new Error('NO_PLAN')
    if (isReadonly(project.status)) throw new Error('READONLY')

    const autonomy = project.autonomyLevel || 'execute'
    const autoConfirm = autonomy === 'execute'

    project.messages.push(msg('user', '确认执行智能体计划'))
    pushSnapshot(project, '一键执行计划')
    const exec = await this.runAgentExecution(project, { autoConfirm, silent: true })

    project.agentPlan = null
    const reply = await buildAgentReply(
      project,
      '确认执行计划',
      exec.autoCompletedPhases,
      exec.justGeneratedMaterial,
    )
    project.messages.push(
      msg('agent', reply, exec.actions.length ? exec.actions : undefined),
    )

    this.save(project)
    return project
  }

  dismissPlan(id: string): InitiationProject {
    const project = this.get(id)
    if (!project) throw new Error('NOT_FOUND')
    project.agentPlan = null
    this.save(project)
    return project
  }

  rollback(id: string): InitiationProject {
    const project = this.get(id)
    if (!project) throw new Error('NOT_FOUND')
    if (isReadonly(project.status)) throw new Error('READONLY')
    if (!project.agentSnapshots?.length) throw new Error('NO_SNAPSHOT')

    const snap = project.agentSnapshots.pop()!
    applySnapshot(project, snap)
    project.messages.push(msg('system', `↩ 已撤销智能体操作：${snap.label}`))
    this.save(project)
    return project
  }

  /** @deprecated 保留兼容，内部转发至 chat */
  async submitAnswer(id: string, answer: string): Promise<InitiationProject> {
    return this.chat(id, answer)
  }

  async completeModule(
    project: InitiationProject,
    phaseId: PhaseId,
    opts: { silent?: boolean; autoConfirm?: boolean } = {},
  ): Promise<InitiationProject> {
    const { silent = false, autoConfirm = false } = opts
    const phaseDef = PHASES.find((p) => p.id === phaseId)
    if (!phaseDef || phaseId === 'approval' || phaseId === 'complete') {
      this.save(project)
      return project
    }

    if (!isModuleReady(project, phaseId)) {
      this.save(project)
      return project
    }

    if (phaseId === 'setup') {
      syncMetaFromAnswers(project)
      project.currentNode = 'collecting'
    }

    if (phaseDef.reportKey && REPORT_PHASES.includes(phaseDef.reportKey)) {
      if (getLatestMaterial(project, phaseDef.reportKey)) {
        project.phaseStatuses[phaseId] = 'completed'
        syncPhaseStatuses(project)
        updateProjectReadiness(project)
        this.save(project)
        return project
      }

      project.agentTask = `正在生成《${phaseDef.reportTitle}》...`

      const result = await generateReport({
        phase: phaseDef.reportKey,
        answers: project.answers,
        meta: {
          name: project.title,
          projectType: project.projectType,
          proposer: project.proposer,
        },
        reports: reportsMap(project),
      })

      project.validationWarnings = result.warnings
      for (const s of result.sources) {
        if (!project.ruleRefs.includes(s.docId)) project.ruleRefs.push(s.docId)
      }

      const material = upsertMaterial(
        project,
        phaseDef.reportKey,
        phaseDef.reportTitle || phaseDef.reportKey,
        result.markdown,
        result.sources.map((s) => s.docId),
      )

      if (autoConfirm) {
        material.status = 'confirmed'
        material.confirmedAt = now()
      }

      if (!silent) {
        project.messages.push(
          msg(
            'agent',
            `📄 材料《${phaseDef.reportTitle}》已生成（${result.mode === 'llm' ? 'AI' : '规则库增强'}）。\n\n请在右侧确认材料，确认后将归档至本项目。`,
          ),
        )
      }

      if (phaseDef.reportKey === 'budget') {
        const views = generateApprovalViews({
          name: project.title,
          proposer: project.proposer,
        })
        upsertMaterial(project, 'approval_l1', '一级审批视图', views.level1, [])
        upsertMaterial(project, 'approval_l2', '二级审批视图', views.level2, [])
        upsertMaterial(project, 'approval_l3', '三级审批视图', views.level3, [])
      }

      project.agentTask = null
    } else if (!silent) {
      project.messages.push(msg('agent', `✅ **${phaseDef.title}** 信息已整理完成。`))
    }

    project.phaseStatuses[phaseId] = 'completed'
    syncPhaseStatuses(project)
    updateProjectReadiness(project)
    this.save(project)
    return project
  }

  /** @deprecated 保留兼容 */
  async completePhase(
    project: InitiationProject,
    opts: { silent?: boolean; autoConfirm?: boolean } = {},
  ): Promise<InitiationProject> {
    return this.completeModule(project, project.currentPhase, opts)
  }

  async advancePhase(
    project: InitiationProject,
    opts: { silent?: boolean } = {},
  ): Promise<InitiationProject> {
    syncPhaseStatuses(project)
    updateProjectReadiness(project)
    if (!opts.silent && allMaterialsConfirmed(project)) {
      project.messages.push(msg('agent', '全部材料已就绪，可提交三级审批。'))
    }
    this.save(project)
    return project
  }

  async confirmMaterial(id: string, materialType: string): Promise<InitiationProject> {
    const project = this.get(id)
    if (!project) throw new Error('NOT_FOUND')
    if (isReadonly(project.status)) throw new Error('READONLY')

    const material = getLatestMaterial(project, materialType)
    if (!material) throw new Error('MATERIAL_NOT_FOUND')

    material.status = 'confirmed'
    material.confirmedAt = now()
    project.messages.push(msg('system', `✅ 材料《${material.title}》已确认，纳入本项目归档。`))

    if (allMaterialsConfirmed(project)) {
      project.status = 'material_ready'
      project.complianceWarnings = runComplianceCheck(project)
      syncPhaseStatuses(project)
      project.messages.push(
        msg('agent', '全部材料已确认。请查看合规检查结果，确认后可提交三级审批。'),
      )
    } else {
      syncPhaseStatuses(project)
    }

    this.save(project)
    return project
  }

  async advanceAfterConfirm(id: string): Promise<InitiationProject> {
    const project = this.get(id)
    if (!project) throw new Error('NOT_FOUND')

    syncPhaseStatuses(project)
    updateProjectReadiness(project)
    this.save(project)
    return project
  }

  async prepareApproval(id: string): Promise<InitiationProject> {
    const project = this.get(id)
    if (!project) throw new Error('NOT_FOUND')
    project.complianceWarnings = runComplianceCheck(project)
    project.approvalPreview = await buildApprovalPreview(project)
    this.save(project)
    return project
  }

  async submitForApproval(id: string): Promise<InitiationProject> {
    const project = this.get(id)
    if (!project) throw new Error('NOT_FOUND')

    if (!project.approvalPreview?.ready) {
      project.approvalPreview = await buildApprovalPreview(project)
    }
    if (!project.approvalPreview.ready) {
      throw new Error(`COMPLIANCE: 预检未通过，请先完成合规检查清单`)
    }

    project.complianceWarnings = runComplianceCheck(project)
    if (project.complianceWarnings.length) {
      throw new Error(`COMPLIANCE: ${project.complianceWarnings.join('; ')}`)
    }
    if (!allMaterialsConfirmed(project)) {
      throw new Error('材料未全部确认，无法提交审批')
    }

    lockAllMaterials(project)
    project.status = 'pending_l1'
    project.approvalLevel = 0
    project.currentPhase = 'approval'
    project.phaseStatuses.approval = 'active'
    project.submittedAt = now()
    project.currentNode = 'approve_l1'
    project.approvalPreview = null
    const l1 = formatApproverLabel(1, project.department)
    project.messages.push(msg('agent', `已提交一级审批，等待 ${l1} 审阅。材料已锁定。`))

    this.save(project)
    return project
  }

  processApproval(
    id: string,
    level: 1 | 2 | 3,
    decision: 'approve' | 'conditional' | 'reject',
    opinion: string,
    conditions: string[] = [],
  ): InitiationProject {
    const project = this.get(id)
    if (!project) throw new Error('NOT_FOUND')

    const record: ApprovalRecord = {
      id: uid(),
      level,
      approver: formatApproverLabel(level, level === 1 ? project.department : undefined),
      decision,
      opinion,
      conditions,
      decidedAt: now(),
    }
    project.approvals.push(record)

    if (decision === 'reject') {
      project.status = 'rejected'
      project.finalDecision = 'rejected'
      project.version += 1
      project.messages.push(
        msg('system', `❌ ${formatApproverLabel(level, level === 1 ? project.department : undefined)} 驳回：${opinion}\n\n请修改后重新采集。`),
      )
      this.save(project)
      return project
    }

    if (level === 3) {
      project.approvalLevel = 3
      if (decision === 'conditional') {
        project.status = 'conditional'
        project.finalDecision = 'conditional'
        project.messages.push(
          msg('system', `✅ 三级附条件通过。条件：${conditions.join('；') || opinion}`),
        )
      } else {
        project.status = 'approved'
        project.finalDecision = 'approved'
        project.messages.push(msg('system', '✅ 三级审批通过，正在归档...'))
      }
      return this.archive(id)
    }

    project.approvalLevel = level
    project.status = level === 1 ? 'pending_l2' : 'pending_l3'
    project.currentNode = level === 1 ? 'approve_l2' : 'approve_l3'
    const nextLevel = (level + 1) as 2 | 3
    project.messages.push(
      msg(
        'system',
        `✅ ${formatApproverLabel(level, level === 1 ? project.department : undefined)} 已通过，进入 ${formatApproverLabel(nextLevel)} 审阅。`,
      ),
    )

    this.save(project)
    return project
  }

  archive(id: string): InitiationProject {
    const project = this.get(id)!
    const archivedAt = now()

    project.status = 'archived'
    project.currentPhase = 'complete'
    project.phaseStatuses.complete = 'completed'
    project.archivedAt = archivedAt
    project.currentNode = 'archived'

    project.archive = {
      archivedAt,
      projectNo: project.projectNo,
      title: project.title,
      version: project.version,
      materialCount: project.materials.length,
      approvalCount: project.approvals.length,
      ruleRefDocIds: project.ruleRefs,
    }

    knowledgeBase.addDocument({
      title: `${project.projectNo} ${project.title}（归档摘要）`,
      kbType: 'reference_case',
      content: this.buildArchiveSummary(project),
      metadata: {
        projectNo: project.projectNo,
        projectId: project.id,
        projectType: project.projectType,
        outcome: project.finalDecision,
        budget: project.budgetRange,
        department: project.department,
      },
    })

    project.messages.push(
      msg(
        'agent',
        `📦 立项已正式归档（${project.projectNo}）。共 ${project.materials.length} 份材料、${project.approvals.length} 条审批记录，已写入历史参考库。`,
      ),
    )

    this.save(project)
    return project
  }

  buildArchiveSummary(project: InitiationProject): string {
    const a = project.answers
    const g = project.goNoGoAssessment
    return `# 立项归档摘要：${project.projectNo}

## 基本信息
- 项目名称：${project.title}
- 提出部门：${project.department}
- 提出人：${project.proposer}
- 项目类型：${project.projectType}
- 预算：${project.budgetRange}
- 决策：${project.finalDecision}
- 归档时间：${project.archivedAt}

## 核心采集摘要
- 项目想法：${a.project_idea || '—'}
- 目标市场：${a.target_market || '—'}
- 竞品：${a.known_competitors || '—'}
- 差异化：${a.differentiation || '—'}
- MVP 功能：${a.mvp_features || '—'}
- 战略契合：${a.strategy_alignment || '—'}

${g ? `## Go/No-Go 评分\n- 综合分：${g.overallScore}\n- 结论：${g.verdictLabel}\n- 优势：${g.keyStrengths.join('；') || '—'}\n` : ''}

## 材料清单
${project.materials.map((m) => `- ${m.title} v${m.version} [${m.status}]`).join('\n')}

## 审批记录
${project.approvals.map((a) => `- L${a.level} ${a.decision}: ${a.opinion}`).join('\n') || '无'}
`
  }

  async ask(id: string, question: string): Promise<InitiationProject> {
    const project = this.get(id)
    if (!project) throw new Error('NOT_FOUND')

    project.messages.push(msg('user', question))
    const { answer, sources } = await askAssistant(question, {
      meta: { name: project.title, projectType: project.projectType, proposer: project.proposer },
      answers: project.answers,
      phase: project.currentPhase,
    })
    for (const s of sources) {
      if (!project.ruleRefs.includes(s.docId)) project.ruleRefs.push(s.docId)
    }
    project.messages.push(msg('agent', answer))
    this.save(project)
    return project
  }

  compliance(id: string): InitiationProject {
    const project = this.get(id)
    if (!project) throw new Error('NOT_FOUND')
    project.complianceWarnings = runComplianceCheck(project)
    this.save(project)
    return project
  }

  getApprovalRolesConfig(): ApprovalRolesConfig {
    return getApprovalRoles()
  }

  updateApprovalRolesConfig(config: ApprovalRolesConfig): ApprovalRolesConfig {
    return saveApprovalRoles(config)
  }

  getIntegrationConfig(): IntegrationConfig {
    return readIntegrationConfig()
  }

  updateIntegrationConfig(config: Partial<IntegrationConfig>): IntegrationConfig {
    return saveIntegrationConfig(config)
  }

  getContextRules(id: string) {
    const project = this.get(id)
    if (!project) throw new Error('NOT_FOUND')
    const phaseId = project.focusPhase ?? project.currentPhase
    return getContextRulesForPhase(phaseId, project.title)
  }

  async pushIntegration(id: string, target: 'jira' | 'feishu'): Promise<InitiationProject> {
    const project = this.get(id)
    if (!project) throw new Error('NOT_FOUND')
    if (project.status !== 'archived') {
      throw new Error('READONLY: 仅归档项目可推送到外部系统')
    }
    if (!project.integrationPushes) project.integrationPushes = []
    const result = await pushToIntegration(project, target)
    const { webhookSent, webhookError, ...push } = result
    const idx = project.integrationPushes.findIndex((p) => p.target === target)
    if (idx >= 0) project.integrationPushes[idx] = push
    else project.integrationPushes.push(push)

    appendWebhookLog({
      projectId: project.id,
      projectNo: project.projectNo,
      projectTitle: project.title,
      target,
      externalId: push.externalId,
      url: push.url,
      summary: push.summary,
      webhookSent: Boolean(webhookSent),
      webhookError,
    })

    const label = target === 'jira' ? 'Jira' : '飞书项目'
    let webhookNote = ''
    if (readIntegrationConfig().webhookEnabled) {
      webhookNote = webhookSent
        ? ' · Webhook 已触发'
        : webhookError
          ? ` · Webhook 失败：${webhookError}`
          : ' · 未配置 Webhook URL'
    }
    project.messages.push(
      msg('system', `🔗 已推送到 ${label}：${push.externalId}（${push.summary}）${webhookNote}`),
    )
    this.save(project)
    return project
  }
}

export const initiationService = new InitiationService()
