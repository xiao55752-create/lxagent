import type { InitiationProject, PhaseId } from '../types.js'
import { getLatestMaterial, allMaterialsConfirmed } from './compliance.js'
import { getMissingFields, PHASE_REQUIRED_FIELDS } from './fieldExtract.js'
import { PHASES, REPORT_PHASES } from './phases.js'

/** 可在对话中独立触发的立项能力模块（非顺序流程） */
export const WORK_MODULES: PhaseId[] = [
  'setup',
  'background',
  'market',
  'competitive',
  'product',
  'technical',
  'feasibility',
  'budget',
]

export const FEASIBILITY_PREREQS = ['market', 'competitive', 'product', 'technical']

export function feasibilityPrereqsMet(project: InitiationProject): boolean {
  return FEASIBILITY_PREREQS.every((k) => !!getLatestMaterial(project, k))
}

export function hasModuleMaterial(project: InitiationProject, phaseId: PhaseId): boolean {
  const def = PHASES.find((p) => p.id === phaseId)
  if (!def?.reportKey) return false
  return !!getLatestMaterial(project, def.reportKey)
}

export function isModuleReady(project: InitiationProject, phaseId: PhaseId): boolean {
  if (phaseId === 'feasibility') return feasibilityPrereqsMet(project)
  return getMissingFields(phaseId, project.answers).length === 0
}

export function isModuleComplete(project: InitiationProject, phaseId: PhaseId): boolean {
  const def = PHASES.find((p) => p.id === phaseId)
  if (def?.reportKey) return hasModuleMaterial(project, phaseId)
  return isModuleReady(project, phaseId)
}

export function moduleProgress(project: InitiationProject, phaseId: PhaseId): number {
  const required = PHASE_REQUIRED_FIELDS[phaseId] || []
  if (phaseId === 'feasibility') {
    return feasibilityPrereqsMet(project) ? (hasModuleMaterial(project, 'feasibility') ? 100 : 50) : 0
  }
  if (!required.length) return isModuleComplete(project, phaseId) ? 100 : 0
  const filled = required.filter((f) => project.answers[f]?.trim()).length
  if (hasModuleMaterial(project, phaseId)) return 100
  return Math.round((filled / required.length) * 100)
}

/** 根据采集与材料状态同步各模块进度（互不依赖顺序） */
export function syncPhaseStatuses(project: InitiationProject): void {
  for (const moduleId of WORK_MODULES) {
    if (isModuleComplete(project, moduleId)) {
      project.phaseStatuses[moduleId] = 'completed'
      continue
    }

    if (moduleId === 'feasibility' && !feasibilityPrereqsMet(project)) {
      project.phaseStatuses[moduleId] = 'pending'
      continue
    }

    const required = PHASE_REQUIRED_FIELDS[moduleId] || []
    const filled = required.filter((f) => project.answers[f]?.trim()).length
    const ready = isModuleReady(project, moduleId)

    if (ready || filled > 0) {
      project.phaseStatuses[moduleId] = 'active'
    } else {
      project.phaseStatuses[moduleId] = 'pending'
    }
  }

  const reportsDone = REPORT_PHASES.every((t) => {
    const m = getLatestMaterial(project, t)
    return m && m.status !== 'draft'
  })

  if (reportsDone && allMaterialsConfirmed(project)) {
    project.phaseStatuses.approval =
      ['pending_l1', 'pending_l2', 'pending_l3', 'approved', 'conditional', 'archived'].includes(
        project.status,
      )
        ? 'completed'
        : 'active'
  } else if (project.materials.some((m) => REPORT_PHASES.includes(m.materialType))) {
    project.phaseStatuses.approval = 'pending'
  }

  if (project.status === 'archived' || project.status === 'approved') {
    project.phaseStatuses.complete = 'completed'
  }
}

/** 智能体执行顺序：优先用户关注模块，其余就绪模块任意顺序 */
export function getExecutionOrder(project: InitiationProject): PhaseId[] {
  const ready = WORK_MODULES.filter((id) => isModuleReady(project, id) && !isModuleComplete(project, id))
  const focus = project.focusPhase
  if (focus && ready.includes(focus)) {
    return [focus, ...ready.filter((id) => id !== focus)]
  }
  return ready
}

export function updateProjectReadiness(project: InitiationProject): void {
  syncPhaseStatuses(project)

  const hasReports = project.materials.some((m) => REPORT_PHASES.includes(m.materialType))
  if (hasReports && project.status === 'collecting') {
    project.status = allMaterialsConfirmed(project) ? 'material_ready' : 'collecting'
  }

  if (allMaterialsConfirmed(project) && isModuleComplete(project, 'budget')) {
    project.status = 'material_ready'
    project.currentNode = 'submit'
  }
}

export const MODULE_PROMPTS: Record<string, string> = {
  setup: '项目基本信息（名称、提出人、类型等）',
  background: '项目背景、痛点与战略价值',
  market: '目标市场、客户与付费模式',
  competitive: '竞品与差异化优势',
  product: '产品价值主张与 MVP 功能',
  technical: '技术路线与团队能力',
  feasibility: '综合可行性评估（需先有四份分析报告）',
  budget: '团队配置与预算区间',
}
