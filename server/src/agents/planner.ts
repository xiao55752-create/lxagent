import { PHASES } from '../workflow/phases.js'
import type { AgentPlanStep, InitiationProject } from '../types.js'
import { isModuleComplete, isModuleReady, WORK_MODULES } from '../workflow/modules.js'

/** 根据各模块就绪状态生成独立执行计划（非顺序流程） */
export function buildAgentPlan(project: InitiationProject): AgentPlanStep[] {
  const steps: AgentPlanStep[] = []

  for (const phaseId of WORK_MODULES) {
    if (!isModuleReady(project, phaseId) || isModuleComplete(project, phaseId)) continue

    const phaseDef = PHASES.find((p) => p.id === phaseId)
    if (!phaseDef) continue

    if (phaseDef.reportKey) {
      steps.push({
        id: `plan-${phaseId}`,
        phaseId,
        title: `生成《${phaseDef.reportTitle}》`,
        action: 'generate_material',
        status: 'pending',
      })
    } else {
      steps.push({
        id: `plan-${phaseId}`,
        phaseId,
        title: `完成「${phaseDef.title}」`,
        action: 'complete_phase',
        status: 'pending',
      })
    }
  }

  return steps
}

export const AUTONOMY_LABELS: Record<string, string> = {
  suggest: '建议模式 — 仅提取信息并生成计划，等你确认后执行',
  draft: '草稿模式 — 自动生成材料草稿，需你确认后归档',
  execute: '自动模式 — 提取、生成、归档全自动推进',
}
