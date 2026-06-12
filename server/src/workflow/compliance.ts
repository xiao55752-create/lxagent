import { knowledgeBase } from '../kb/index.js'
import { buildPreReviewReport } from '../agents/preReview.js'
import type {
  ApprovalCheckItem,
  ApprovalPreview,
  ComplianceCellStatus,
  ComplianceMatrixRow,
  InitiationProject,
  Material,
} from '../types.js'
import { FIELD_LABELS } from './fieldExtract.js'
import { PHASES, REPORT_PHASES } from './phases.js'

const REQUIRED_ANSWERS = ['project_name', 'proposer', 'project_type', 'budget_range']

const MATERIAL_TITLES: Record<string, string> = {
  market: '市场分析报告',
  competitive: '竞品分析报告',
  product: '产品解决方案',
  technical: '技术路线方案',
  feasibility: '项目可行性分析报告',
  budget: '资源与预算',
}

export function runComplianceCheck(project: InitiationProject): string[] {
  const warnings: string[] = []

  for (const key of REQUIRED_ANSWERS) {
    if (!project.answers[key]?.trim()) {
      warnings.push(`缺少必填项：${FIELD_LABELS[key] || key}（依据《项目立项管理办法》）`)
    }
  }

  const reportMaterials = project.materials.filter((m) =>
    REPORT_PHASES.includes(m.materialType),
  )
  const missingReports = REPORT_PHASES.filter(
    (t) => !reportMaterials.some((m) => m.materialType === t && m.status !== 'draft'),
  )
  if (missingReports.length) {
    warnings.push(`以下材料尚未确认：${missingReports.map((t) => MATERIAL_TITLES[t] || t).join('、')}`)
  }

  const unconfirmed = reportMaterials.filter((m) => m.status === 'draft')
  if (unconfirmed.length && ['material_ready', 'collecting'].includes(project.status)) {
    warnings.push(`有 ${unconfirmed.length} 份材料仍为草稿，提交前须确认`)
  }

  const budget = project.answers.budget_range || project.budgetRange || ''
  const budgetMatch = budget.match(/(\d+)/)
  if (budgetMatch && Number(budgetMatch[1]) > 300) {
    warnings.push('预算超过 300 万建议上限，须二级委员会重点审查 [依据: 项目立项管理办法]')
  }

  const policyHits = knowledgeBase.search('立项 必填 材料 审批', {
    kbTypes: ['policy_process', 'policy_approval'],
    limit: 2,
  })
  for (const hit of policyHits) {
    if (!project.ruleRefs.includes(hit.docId)) {
      project.ruleRefs.push(hit.docId)
    }
  }

  if (project.projectType === '新品' || project.answers.project_type === '新品') {
    if (!project.answers.target_market) {
      warnings.push('新品类项目须完成市场分析采集 [依据: 项目立项管理办法]')
    }
    if (!project.answers.known_competitors) {
      warnings.push('新品类项目须完成竞品分析采集 [依据: 项目立项管理办法]')
    }
  }

  return [...new Set([...warnings, ...project.validationWarnings])]
}

export function buildComplianceMatrix(project: InitiationProject): ComplianceMatrixRow[] {
  const rows: ComplianceMatrixRow[] = []

  for (const key of REQUIRED_ANSWERS) {
    const val = project.answers[key]?.trim()
    rows.push({
      id: `field_${key}`,
      category: '基本信息',
      requirement: FIELD_LABELS[key] || key,
      source: '立项管理办法 §3.1',
      status: val ? 'pass' : 'fail',
      evidence: val ? val.slice(0, 48) : undefined,
      blocking: true,
    })
  }

  for (const type of REPORT_PHASES) {
    const m = getLatestMaterial(project, type)
    const title = MATERIAL_TITLES[type] || type
    let status: ComplianceCellStatus = 'fail'
    if (m) {
      status = m.status === 'draft' ? 'warn' : 'pass'
    }
    rows.push({
      id: `material_${type}`,
      category: '核心材料',
      requirement: `《${title}》确认归档`,
      source: '立项管理办法 §4.2',
      status,
      evidence: m ? `v${m.version} · ${materialStatusLabel(m)}` : '未生成',
      materialType: type,
      blocking: true,
    })
  }

  const budget = project.answers.budget_range || project.budgetRange || ''
  const budgetNum = budget.match(/(\d+)/)?.[1]
  if (budgetNum) {
    const over = Number(budgetNum) > 300
    rows.push({
      id: 'rule_budget_cap',
      category: '合规规则',
      requirement: '预算在管理办法建议范围内（≤300万）',
      source: '立项管理办法 §5.3',
      status: over ? 'warn' : 'pass',
      evidence: budget,
      blocking: false,
    })
  } else {
    rows.push({
      id: 'rule_budget_cap',
      category: '合规规则',
      requirement: '预算在管理办法建议范围内（≤300万）',
      source: '立项管理办法 §5.3',
      status: 'pending',
      blocking: false,
    })
  }

  const isNewProduct =
    project.projectType === '新品' || project.answers.project_type === '新品'
  if (isNewProduct) {
    rows.push({
      id: 'rule_new_product_market',
      category: '合规规则',
      requirement: '新品类须完成市场分析',
      source: '立项管理办法 §4.5',
      status: project.answers.target_market?.trim()
        ? 'pass'
        : getLatestMaterial(project, 'market')
          ? 'warn'
          : 'fail',
      evidence: project.answers.target_market?.slice(0, 40),
      blocking: true,
    })
    rows.push({
      id: 'rule_new_product_competitive',
      category: '合规规则',
      requirement: '新品类须完成竞品分析',
      source: '立项管理办法 §4.5',
      status: project.answers.known_competitors?.trim()
        ? 'pass'
        : getLatestMaterial(project, 'competitive')
          ? 'warn'
          : 'fail',
      evidence: project.answers.known_competitors?.slice(0, 40),
      blocking: true,
    })
  }

  rows.push({
    id: 'rule_refs',
    category: '依据引用',
    requirement: '材料已引用规则/标准依据',
    source: '知识库 RAG',
    status: project.ruleRefs.length > 0 ? 'pass' : 'warn',
    evidence: `${project.ruleRefs.length} 条依据`,
    blocking: false,
  })

  const strat = project.answers.strategy_alignment?.trim()
  rows.push({
    id: 'strategy_alignment',
    category: '战略匹配',
    requirement: '项目与战略目标契合说明',
    source: '立项管理办法 §2.2',
    status: strat ? 'pass' : 'warn',
    evidence: strat?.slice(0, 40),
    blocking: false,
  })

  return rows
}

function materialStatusLabel(m: Material): string {
  if (m.status === 'confirmed') return '已确认'
  if (m.status === 'locked') return '已锁定'
  return '草稿'
}

export async function buildApprovalPreview(project: InitiationProject): Promise<ApprovalPreview> {
  const warnings = runComplianceCheck(project)
  const matrix = buildComplianceMatrix(project)
  const report = await buildPreReviewReport(project, matrix, warnings)

  const checklist: ApprovalCheckItem[] = []

  checklist.push({
    id: 'basic_info',
    label: '基本信息完整（项目名称、提出人、类型、预算）',
    ok: REQUIRED_ANSWERS.every((k) => project.answers[k]?.trim()),
    hint: '请在对话中补充缺失的基本信息',
  })

  const confirmedCount = REPORT_PHASES.filter((t) => {
    const m = getLatestMaterial(project, t)
    return m && m.status !== 'draft'
  }).length

  checklist.push({
    id: 'materials',
    label: `6 份核心材料已确认（当前 ${confirmedCount}/6）`,
    ok: allMaterialsConfirmed(project),
    hint: '请在右侧材料面板确认各份报告',
  })

  checklist.push({
    id: 'compliance',
    label: '合规检查通过（无阻断项）',
    ok: warnings.length === 0,
    hint: warnings[0] || undefined,
  })

  checklist.push({
    id: 'rule_refs',
    label: '已引用规则标准依据',
    ok: project.ruleRefs.length > 0,
    hint: '智能体将在材料生成时自动引用规则库',
  })

  checklist.push({
    id: 'pre_review',
    label: `AI 预审：${report.recommendationLabel}`,
    ok: report.recommendation === 'approve' || report.recommendation === 'conditional',
    hint: report.recommendation === 'supplement' ? '建议先补充材料' : report.recommendation === 'reject' ? '当前不建议提交' : undefined,
  })

  const blockingFails = matrix.filter((r) => r.blocking && r.status === 'fail')
  const ready =
    checklist.filter((c) => c.id !== 'pre_review').every((c) => c.ok) &&
    blockingFails.length === 0 &&
    allMaterialsConfirmed(project)

  return {
    checkedAt: new Date().toISOString(),
    ready,
    checklist,
    matrix,
    report,
  }
}

/** @deprecated 同步兼容，不含 LLM 增强 */
export function buildApprovalChecklist(project: InitiationProject): ApprovalPreview {
  const warnings = runComplianceCheck(project)
  const matrix = buildComplianceMatrix(project)
  const report = {
    recommendation: 'supplement' as const,
    recommendationLabel: '建议补充材料后提交',
    confidence: 50,
    predictedPassRate: 0,
    summary: '请运行完整预检以获取 AI 预审报告',
    conflicts: [],
    risks: warnings,
    suggestedActions: ['点击「开始预检」生成完整报告'],
    generatedBy: 'rules' as const,
  }

  const blockingFails = matrix.filter((r) => r.blocking && r.status === 'fail')
  const ready = blockingFails.length === 0 && allMaterialsConfirmed(project)

  return {
    checkedAt: new Date().toISOString(),
    ready,
    checklist: [
      {
        id: 'basic_info',
        label: '基本信息完整',
        ok: REQUIRED_ANSWERS.every((k) => project.answers[k]?.trim()),
      },
      {
        id: 'materials',
        label: '核心材料已确认',
        ok: allMaterialsConfirmed(project),
      },
    ],
    matrix,
    report,
  }
}

export function allMaterialsConfirmed(project: InitiationProject): boolean {
  return REPORT_PHASES.every((type) => {
    const m = getLatestMaterial(project, type)
    return m && (m.status === 'confirmed' || m.status === 'locked')
  })
}

export function getLatestMaterial(project: InitiationProject, type: string): Material | undefined {
  return [...project.materials]
    .filter((m) => m.materialType === type)
    .sort((a, b) => b.version - a.version)[0]
}

export function lockAllMaterials(project: InitiationProject) {
  const now = new Date().toISOString()
  for (const m of project.materials) {
    if (m.status === 'confirmed') {
      m.status = 'locked'
      m.lockedAt = now
    }
  }
}

export function isCollectingAllowed(status: InitiationProject['status']) {
  return ['draft', 'collecting', 'material_ready', 'rejected'].includes(status)
}

export function isReadonly(status: InitiationProject['status']) {
  return ['archived', 'pending_l1', 'pending_l2', 'pending_l3', 'approved', 'conditional'].includes(status)
}
