import { chatCompletion, isLlmConfigured } from '../llm/client.js'
import { knowledgeBase } from '../kb/index.js'
import type {
  ApprovalPreReviewReport,
  ComplianceMatrixRow,
  InitiationProject,
  PreReviewRecommendation,
} from '../types.js'

const REC_LABELS: Record<PreReviewRecommendation, string> = {
  approve: '建议通过',
  conditional: '建议附条件通过',
  reject: '建议驳回',
  supplement: '建议补充材料后提交',
}

function detectConflicts(project: InitiationProject): string[] {
  const conflicts: string[] = []
  const a = project.answers
  const budget = a.budget_range || project.budgetRange || ''
  const team = a.team_config || ''

  const budgetNums = [...budget.matchAll(/(\d+)/g)].map((m) => Number(m[1]))
  const maxBudget = budgetNums.length ? Math.max(...budgetNums) : 0

  if (maxBudget > 0 && maxBudget < 80 && /8|10|12|大规模|多人/.test(team)) {
    conflicts.push('团队配置规模与预算区间可能不匹配，建议复核人力成本假设')
  }

  const duration = a.duration || project.duration || ''
  const mvp = a.mvp_timeline || ''
  if (duration && mvp) {
    const dMonths = duration.match(/(\d+)/)?.[1]
    const mMonths = mvp.match(/(\d+)/)?.[1]
    if (dMonths && mMonths && Number(mMonths) > Number(dMonths)) {
      conflicts.push(`MVP 周期（${mvp}）长于项目总周期（${duration}），存在排期冲突`)
    }
  }

  if (project.projectType === '新品' || a.project_type === '新品') {
    if (!a.target_market && !a.known_competitors) {
      conflicts.push('新品类项目同时缺少目标市场与竞品信息，战略论证不完整')
    }
  }

  if (a.budget_range && project.budgetRange && a.budget_range !== project.budgetRange) {
    conflicts.push('对话采集预算与项目元数据预算不一致，请统一口径')
  }

  return conflicts
}

function buildRuleBasedReport(
  project: InitiationProject,
  matrix: ComplianceMatrixRow[],
  warnings: string[],
): ApprovalPreReviewReport {
  const blockingFails = matrix.filter((r) => r.blocking && r.status === 'fail')
  const warns = matrix.filter((r) => r.status === 'warn')
  const passes = matrix.filter((r) => r.status === 'pass')
  const conflicts = detectConflicts(project)

  let recommendation: PreReviewRecommendation = 'approve'
  if (blockingFails.length >= 3) recommendation = 'reject'
  else if (blockingFails.length > 0) recommendation = 'supplement'
  else if (warns.length > 0 || warnings.length > 0 || conflicts.length > 0) {
    recommendation = 'conditional'
  }

  const passRate = matrix.length
    ? Math.round((passes.length / matrix.length) * 100)
    : 0

  const risks: string[] = []
  if (warnings.some((w) => w.includes('300 万'))) {
    risks.push('预算超过管理办法建议上限，二级委员会将重点审查')
  }
  if (project.projectType === '新品') {
    risks.push('新品类项目需重点验证市场与竞品论证充分性')
  }
  if (warns.some((w) => w.materialType)) {
    risks.push(`${warns.length} 份核心材料仍为草稿，审批前须确认归档`)
  }

  const suggestedActions: string[] = []
  for (const row of blockingFails.slice(0, 3)) {
    suggestedActions.push(`补充：${row.requirement}`)
  }
  if (warns.length) {
    suggestedActions.push('在右侧材料面板确认全部草稿材料')
  }
  for (const c of conflicts) {
    suggestedActions.push(`解决冲突：${c}`)
  }
  if (!suggestedActions.length && recommendation === 'approve') {
    suggestedActions.push('预检已通过，可提交三级审批')
  }

  const summaryParts: string[] = []
  summaryParts.push(
    `共检查 ${matrix.length} 项要求，${passes.length} 项满足、${blockingFails.length} 项缺失、${warns.length} 项待确认。`,
  )
  if (conflicts.length) {
    summaryParts.push(`发现 ${conflicts.length} 处逻辑冲突需关注。`)
  }
  summaryParts.push(`综合建议：${REC_LABELS[recommendation]}。`)

  return {
    recommendation,
    recommendationLabel: REC_LABELS[recommendation],
    confidence: Math.min(95, passRate + (conflicts.length ? -10 : 5)),
    predictedPassRate: passRate,
    summary: summaryParts.join(' '),
    conflicts,
    risks: [...risks, ...warnings.filter((w) => !risks.includes(w)).slice(0, 3)],
    suggestedActions,
    generatedBy: 'rules',
  }
}

export async function buildPreReviewReport(
  project: InitiationProject,
  matrix: ComplianceMatrixRow[],
  warnings: string[],
): Promise<ApprovalPreReviewReport> {
  const base = buildRuleBasedReport(project, matrix, warnings)

  if (!isLlmConfigured()) return base

  try {
    const policyContext = knowledgeBase.search('立项 审批 管理办法 合规', {
      kbTypes: ['policy_process', 'policy_approval'],
      limit: 3,
    })
    const matrixSummary = matrix
      .map((r) => `[${r.status}] ${r.category} - ${r.requirement}`)
      .join('\n')

    const raw = await chatCompletion(
      `你是企业立项预审专家。根据合规矩阵输出 JSON，字段：
recommendation: approve|conditional|reject|supplement
summary: 80字内预审摘要
conflicts: 字符串数组
risks: 字符串数组
suggestedActions: 字符串数组（最多4条）
只输出 JSON。`,
      `项目：${project.title}（${project.projectType}，预算 ${project.budgetRange || project.answers.budget_range || '未填'}）
规则依据：${policyContext.map((h) => h.title).join('；') || '项目立项管理办法'}
合规矩阵：
${matrixSummary}
系统警告：${warnings.join('；') || '无'}
冲突提示：${base.conflicts.join('；') || '无'}`,
    )

    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return base

    const parsed = JSON.parse(jsonMatch[0]) as {
      recommendation?: PreReviewRecommendation
      summary?: string
      conflicts?: string[]
      risks?: string[]
      suggestedActions?: string[]
    }

    const rec = parsed.recommendation && REC_LABELS[parsed.recommendation]
      ? parsed.recommendation
      : base.recommendation

    return {
      recommendation: rec,
      recommendationLabel: REC_LABELS[rec],
      confidence: base.confidence,
      predictedPassRate: base.predictedPassRate,
      summary: parsed.summary?.slice(0, 200) || base.summary,
      conflicts: parsed.conflicts?.length ? parsed.conflicts : base.conflicts,
      risks: parsed.risks?.length ? parsed.risks : base.risks,
      suggestedActions: parsed.suggestedActions?.length
        ? parsed.suggestedActions.slice(0, 4)
        : base.suggestedActions,
      generatedBy: 'llm',
    }
  } catch {
    return base
  }
}
