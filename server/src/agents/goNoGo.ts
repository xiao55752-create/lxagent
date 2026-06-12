import { chatCompletion, isLlmConfigured } from '../llm/client.js'
import type { GoNoGoAssessment, GoNoGoDimension, InitiationProject } from '../types.js'
import { getLatestMaterial, runComplianceCheck } from '../workflow/compliance.js'
import { REPORT_PHASES } from '../workflow/phases.js'

type DimStatus = GoNoGoDimension['status']

function dimStatus(score: number): DimStatus {
  if (score >= 75) return 'strong'
  if (score >= 50) return 'moderate'
  if (score > 0) return 'weak'
  return 'unknown'
}

function scoreFields(project: InitiationProject, keys: string[], weight = 1): number {
  if (!keys.length) return 0
  const filled = keys.filter((k) => project.answers[k]?.trim()).length
  return Math.round((filled / keys.length) * 100 * weight)
}

function scoreMaterial(project: InitiationProject, type: string): number {
  const m = getLatestMaterial(project, type)
  if (!m) return 0
  if (m.status === 'confirmed' || m.status === 'locked') return 100
  return 70
}

function buildDimensions(project: InitiationProject): GoNoGoDimension[] {
  const dims: GoNoGoDimension[] = []

  const marketFieldScore = scoreFields(project, [
    'target_market',
    'target_customers',
    'market_opportunity',
    'pricing_hypothesis',
  ])
  const marketMat = scoreMaterial(project, 'market')
  const marketScore = Math.round(marketFieldScore * 0.5 + marketMat * 0.5)
  dims.push({
    id: 'market',
    label: '市场机会',
    score: marketScore,
    weight: 0.2,
    status: dimStatus(marketScore),
    summary:
      marketScore >= 75
        ? '目标市场与客户画像清晰'
        : marketScore >= 50
          ? '市场信息部分就绪，建议补充付费模式'
          : '市场论证不足',
  })

  const compFieldScore = scoreFields(project, ['known_competitors', 'differentiation'])
  const compMat = scoreMaterial(project, 'competitive')
  const compScore = Math.round(compFieldScore * 0.45 + compMat * 0.55)
  dims.push({
    id: 'competitive',
    label: '竞争壁垒',
    score: compScore,
    weight: 0.15,
    status: dimStatus(compScore),
    summary:
      compScore >= 75
        ? '竞品与差异化论证充分'
        : compScore >= 50
          ? '竞品信息已有，差异化待加强'
          : '竞争分析薄弱',
  })

  const prodFieldScore = scoreFields(project, ['value_proposition', 'mvp_features', 'success_metrics'])
  const prodMat = scoreMaterial(project, 'product')
  const prodScore = Math.round(prodFieldScore * 0.5 + prodMat * 0.5)
  dims.push({
    id: 'product',
    label: '产品方案',
    score: prodScore,
    weight: 0.2,
    status: dimStatus(prodScore),
    summary:
      prodScore >= 75
        ? 'MVP 范围与成功指标明确'
        : prodScore >= 50
          ? '产品方向清晰，细节待完善'
          : '产品方案尚不完整',
  })

  const techFieldScore = scoreFields(project, [
    'existing_capabilities',
    'tech_challenges',
    'mvp_timeline',
  ])
  const techMat = scoreMaterial(project, 'technical')
  const techScore = Math.round(techFieldScore * 0.5 + techMat * 0.5)
  dims.push({
    id: 'technical',
    label: '技术可行',
    score: techScore,
    weight: 0.15,
    status: dimStatus(techScore),
    summary:
      techScore >= 75
        ? '技术路线与团队能力匹配'
        : techScore >= 50
          ? '技术方案有雏形，风险待评估'
          : '技术论证不足',
  })

  const budgetFieldScore = scoreFields(project, ['budget_range', 'team_config'])
  const budgetMat = scoreMaterial(project, 'budget')
  let budgetScore = Math.round(budgetFieldScore * 0.5 + budgetMat * 0.5)
  const budget = project.answers.budget_range || project.budgetRange || ''
  const budgetNum = budget.match(/(\d+)/)?.[1]
  if (budgetNum && Number(budgetNum) > 300) budgetScore = Math.max(40, budgetScore - 15)
  dims.push({
    id: 'budget',
    label: '资源匹配',
    score: budgetScore,
    weight: 0.15,
    status: dimStatus(budgetScore),
    summary:
      budgetScore >= 75
        ? '预算与团队配置合理'
        : budgetScore >= 50
          ? '资源规划初步可行'
          : '预算或团队信息缺失',
  })

  const stratScore = project.answers.strategy_alignment?.trim() ? 85 : project.answers.pain_point ? 55 : 20
  dims.push({
    id: 'strategy',
    label: '战略契合',
    score: stratScore,
    weight: 0.15,
    status: dimStatus(stratScore),
    summary:
      stratScore >= 75
        ? '与战略目标对齐清晰'
        : stratScore >= 50
          ? '战略价值有提及，待深化'
          : '战略契合论证缺失',
  })

  const confirmed = REPORT_PHASES.filter((t) => {
    const m = getLatestMaterial(project, t)
    return m && m.status !== 'draft'
  }).length
  const compScore2 = Math.round((confirmed / REPORT_PHASES.length) * 100)
  const warnings = runComplianceCheck(project)
  let complianceScore = compScore2
  if (warnings.length) complianceScore = Math.max(30, complianceScore - warnings.length * 8)

  dims.push({
    id: 'readiness',
    label: '立项就绪度',
    score: complianceScore,
    weight: 0.1,
    status: dimStatus(complianceScore),
    summary: `${confirmed}/6 份材料已确认${warnings.length ? `，${warnings.length} 项合规提示` : ''}`,
  })

  return dims
}

function ruleBasedAssessment(project: InitiationProject): GoNoGoAssessment {
  const dimensions = buildDimensions(project)
  const overallScore = Math.round(
    dimensions.reduce((sum, d) => sum + d.score * d.weight, 0) /
      dimensions.reduce((sum, d) => sum + d.weight, 0),
  )

  const weakDims = dimensions.filter((d) => d.score < 45)
  let verdict: GoNoGoAssessment['verdict'] = 'go'
  if (overallScore < 50 || weakDims.length >= 3) verdict = 'no_go'
  else if (overallScore < 72 || weakDims.length >= 1) verdict = 'conditional'

  const verdictLabels = {
    go: '建议立项（Go）',
    conditional: '附条件立项（Conditional Go）',
    no_go: '暂不建议立项（No-Go）',
  }

  const keyStrengths = dimensions
    .filter((d) => d.score >= 75)
    .map((d) => `${d.label}：${d.summary}`)
    .slice(0, 3)

  const keyRisks = dimensions
    .filter((d) => d.score < 55)
    .map((d) => `${d.label}偏弱（${d.score}分）`)
  if (runComplianceCheck(project).length) {
    keyRisks.push('存在合规检查提示项')
  }

  return {
    overallScore,
    verdict,
    verdictLabel: verdictLabels[verdict],
    summary: `综合评分 ${overallScore} 分，${verdictLabels[verdict]}。${keyStrengths.length ? `优势：${keyStrengths.length} 项` : '核心论证尚待完善'}。`,
    dimensions,
    keyStrengths,
    keyRisks: keyRisks.slice(0, 5),
    assessedAt: new Date().toISOString(),
    generatedBy: 'rules',
  }
}

export async function buildGoNoGoAssessment(
  project: InitiationProject,
): Promise<GoNoGoAssessment> {
  const base = ruleBasedAssessment(project)

  if (!isLlmConfigured()) return base

  try {
    const raw = await chatCompletion(
      `你是立项投资决策顾问。根据维度评分输出 JSON：
summary: 60字内总结
keyStrengths: 字符串数组最多3条
keyRisks: 字符串数组最多4条
只输出 JSON。`,
      `项目：${project.title}（${project.projectType}）
综合分：${base.overallScore}
结论：${base.verdictLabel}
维度：${base.dimensions.map((d) => `${d.label}${d.score}`).join('、')}`,
    )
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return base
    const parsed = JSON.parse(jsonMatch[0]) as {
      summary?: string
      keyStrengths?: string[]
      keyRisks?: string[]
    }
    return {
      ...base,
      summary: parsed.summary?.slice(0, 120) || base.summary,
      keyStrengths: parsed.keyStrengths?.length ? parsed.keyStrengths : base.keyStrengths,
      keyRisks: parsed.keyRisks?.length ? parsed.keyRisks : base.keyRisks,
      generatedBy: 'llm',
    }
  } catch {
    return base
  }
}
