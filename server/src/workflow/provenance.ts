import type { InitiationProject, MaterialProvenance, PhaseId } from '../types.js'
import { FIELD_LABELS, PHASE_REQUIRED_FIELDS } from './fieldExtract.js'
import { REPORT_PHASES } from './phases.js'

/** 各材料类型关联的采集字段 */
export const MATERIAL_FIELD_MAP: Record<string, string[]> = {
  market: [
    'target_market',
    'target_customers',
    'current_solution',
    'pricing_hypothesis',
    'pain_point',
    'market_opportunity',
  ],
  competitive: ['known_competitors', 'alternatives', 'differentiation', 'entry_barriers'],
  product: [
    'value_proposition',
    'use_cases',
    'mvp_features',
    'out_of_scope',
    'delivery_form',
    'success_metrics',
  ],
  technical: [
    'existing_capabilities',
    'tech_preferences',
    'tech_challenges',
    'mvp_timeline',
    'team_size',
  ],
  feasibility: [
    'strategy_alignment',
    'core_assumptions',
    'cost_of_inaction',
    'pain_point',
    'market_opportunity',
  ],
  budget: ['team_config', 'budget_range', 'phased_investment', 'duration'],
}

const FIELD_KEYWORDS: Record<string, string[]> = {
  target_market: ['市场', '行业', '赛道', '制造'],
  target_customers: ['客户', '工厂', 'B端'],
  known_competitors: ['竞品', '竞争对手', '海康'],
  differentiation: ['差异化', '优势'],
  budget_range: ['预算', '万'],
  mvp_features: ['MVP', '功能'],
  strategy_alignment: ['战略', '契合'],
}

function materialPhaseId(materialType: string): PhaseId | undefined {
  if (REPORT_PHASES.includes(materialType)) return materialType as PhaseId
  return undefined
}

function findRelatedChatMessageIds(
  project: InitiationProject,
  fieldKeys: string[],
): string[] {
  const matched: string[] = []

  for (const message of project.messages) {
    if (message.role !== 'user') continue
    const text = message.content

    const hit = fieldKeys.some((key) => {
      const val = project.answers[key]?.trim()
      if (val && val.length >= 4 && text.includes(val.slice(0, Math.min(16, val.length)))) {
        return true
      }
      const keywords = FIELD_KEYWORDS[key]
      return keywords?.some((kw) => text.includes(kw))
    })

    if (hit) matched.push(message.id)
  }

  if (matched.length) return [...new Set(matched)].slice(-6)

  return project.messages
    .filter((m) => m.role === 'user')
    .slice(-3)
    .map((m) => m.id)
}

export function buildMaterialProvenance(
  project: InitiationProject,
  materialType: string,
  sourceDocIds: string[],
): MaterialProvenance {
  const phaseFields =
    MATERIAL_FIELD_MAP[materialType] ||
    PHASE_REQUIRED_FIELDS[materialType] ||
    Object.keys(project.answers)

  const answerFields = phaseFields.filter((k) => project.answers[k]?.trim())

  return {
    materialType,
    phaseId: materialPhaseId(materialType),
    answerFields,
    sourceDocIds,
    chatMessageIds: findRelatedChatMessageIds(project, phaseFields),
    fieldSnapshots: Object.fromEntries(
      answerFields.map((k) => [k, project.answers[k].slice(0, 120)]),
    ),
    generatedAt: new Date().toISOString(),
  }
}

export function provenanceFieldLabels(fields: string[]): { key: string; label: string; value: string }[] {
  return fields.map((key) => ({
    key,
    label: FIELD_LABELS[key] || key,
    value: '',
  }))
}
