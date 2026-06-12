import type { PhaseId } from '../types.js'
import { PHASES } from './phases.js'

/** 各阶段最少必填字段（智能体从对话中自动提取） */
export const PHASE_REQUIRED_FIELDS: Record<string, string[]> = {
  setup: ['project_idea', 'project_name', 'proposer', 'project_type'],
  background: ['pain_point', 'market_opportunity', 'strategy_alignment'],
  market: ['target_market', 'target_customers', 'pricing_hypothesis'],
  competitive: ['known_competitors', 'differentiation'],
  product: ['value_proposition', 'mvp_features', 'success_metrics'],
  technical: ['existing_capabilities', 'tech_challenges', 'mvp_timeline'],
  budget: ['budget_range', 'team_config'],
}

export const FIELD_LABELS: Record<string, string> = {
  project_idea: '项目想法',
  project_name: '项目名称',
  proposer: '提出人/部门',
  project_type: '项目类型',
  expected_start: '期望启动时间',
  duration: '项目周期',
  pain_point: '业务痛点',
  market_opportunity: '市场机会',
  strategy_alignment: '战略契合',
  cost_of_inaction: '不做的后果',
  core_assumptions: '核心假设',
  target_market: '目标市场',
  target_customers: '目标客户',
  current_solution: '现有解决方案',
  pricing_hypothesis: '付费模式',
  known_competitors: '竞品',
  alternatives: '替代方案',
  differentiation: '差异化',
  entry_barriers: '进入壁垒',
  value_proposition: '价值主张',
  use_cases: '使用场景',
  mvp_features: 'MVP 功能',
  out_of_scope: '不在范围内',
  delivery_form: '交付形态',
  success_metrics: '成功指标',
  existing_capabilities: '团队能力',
  tech_preferences: '技术偏好',
  tech_challenges: '技术难点',
  mvp_timeline: 'MVP 周期',
  team_size: '人力规模',
  team_config: '团队配置',
  budget_range: '预算区间',
  phased_investment: '分期投入',
}

export function getMissingFields(phase: PhaseId, answers: Record<string, string>): string[] {
  const required = PHASE_REQUIRED_FIELDS[phase] || []
  return required.filter((f) => !answers[f]?.trim())
}

/** 从自然语言中 opportunistically 提取字段 */
export function extractFieldsFromText(
  text: string,
  answers: Record<string, string>,
): Record<string, string> {
  const out = { ...answers }
  const t = text.trim()

  const proposerMatch = t.match(/([\u4e00-\u9fa5]{2,8}(?:部|中心|组))\s*[-–—]\s*([\u4e00-\u9fa5]{2,4})/)
  if (proposerMatch) out.proposer = `${proposerMatch[1]}-${proposerMatch[2]}`

  const ideaMatch = t.match(/(?:想(?:做|搞|做一个)|计划做|我们要做)\s*([^，。；,\n]+)/)
  if (ideaMatch) {
    const idea = ideaMatch[1].trim()
    if (!out.project_idea) out.project_idea = idea
    if (!out.project_name) out.project_name = idea.replace(/Agent|平台|系统/g, (m) => m).slice(0, 24)
  } else if (t.length >= 8 && !out.project_idea) {
    const withoutProposer = proposerMatch ? t.replace(proposerMatch[0], '').replace(/^[，,、\s]+/, '') : t
    out.project_idea = withoutProposer || t
  }

  const nameMatch = t.match(/(?:项目名称|项目叫|叫做)[：:是]?\s*[「"']?([^「」"'"\n，。；]+)/)
  if (nameMatch) out.project_name = nameMatch[1].trim()

  if (/Agent|MVP|从零|新做/.test(t) && !out.project_type) out.project_type = '新品'
  else if (/新品|新产品/.test(t) && !out.project_type) out.project_type = '新品'
  else if (/迭代|升级/.test(t) && !out.project_type) out.project_type = '产品迭代'
  else if (/平台/.test(t) && !out.project_type) out.project_type = '平台能力'
  else if (/内部工具|自用/.test(t) && !out.project_type) out.project_type = '内部工具'

  if (/2026\s*Q[1-4]/i.test(t)) out.expected_start = t.match(/2026\s*Q[1-4]/i)![0]
  if (/(\d+)\s*个?月/.test(t) && !out.duration) {
    const m = t.match(/(\d+)\s*个?月/)
    if (m) out.duration = `${m[1]} 个月`
  }

  if (/(\d+)\s*[-~～至到]\s*(\d+)\s*万/.test(t) && !out.budget_range) {
    const m = t.match(/(\d+)\s*[-~～至到]\s*(\d+)\s*万/)
    if (m) out.budget_range = `${m[1]}-${m[2]} 万`
  } else if (/预算.*?(\d+)\s*万/.test(t) && !out.budget_range) {
    const m = t.match(/预算.*?(\d+)\s*万/)
    if (m) out.budget_range = `${m[1]} 万`
  }

  if (/痛点|问题|困难/.test(t) && t.length > 15 && !out.pain_point) out.pain_point = t
  if (/机会|趋势|窗口/.test(t) && t.length > 10 && !out.market_opportunity) out.market_opportunity = t
  if (/战略|契合|对齐|目标/.test(t) && t.length > 10 && !out.strategy_alignment) out.strategy_alignment = t
  if (/竞品|竞争对手|海康|阿丘/.test(t) && !out.known_competitors) {
    const compMatch = t.match(/竞品[：:有]?([^。；\n]+)/)
    out.known_competitors = compMatch ? compMatch[1].trim() : t
  }
  if (/差异化|优势|区别/.test(t) && !out.differentiation) out.differentiation = t
  if (/价值|主张|解决/.test(t) && t.length > 10 && !out.value_proposition) out.value_proposition = t
  if (/MVP|功能|第一版/.test(t) && !out.mvp_features) out.mvp_features = t.slice(0, 120)
  if (/成功|指标|KPI/.test(t) && !out.success_metrics) out.success_metrics = t.slice(0, 80)
  if (/Python|Java|React|团队|技术栈/.test(t) && !out.existing_capabilities) out.existing_capabilities = t.slice(0, 100)
  if (/技术难点|挑战|风险/.test(t) && !out.tech_challenges) out.tech_challenges = t.slice(0, 100)
  if (/(\d+)\s*个?月.*MVP|MVP.*(\d+)\s*个?月/.test(t) && !out.mvp_timeline) {
    const m = t.match(/(\d+)\s*个?月/)
    if (m) out.mvp_timeline = `${m[1]} 个月`
  }
  if (/团队|配置|招聘|人力/.test(t) && !out.team_config) out.team_config = t.slice(0, 100)

  if (/制造业|金融|SaaS|电子|组装|质检|AI/.test(t) && !out.target_market) {
    if (/质检|视觉|制造/.test(t)) out.target_market = '制造业-质检/视觉'
    else out.target_market = t.slice(0, 80)
  }
  if (/制造业|工厂|质检/.test(t) && !out.pain_point) {
    out.pain_point = '制造业质检依赖人工抽检，效率低、漏检风险高'
  }
  if (/替代人工|人工抽检|降本/.test(t) && !out.market_opportunity) {
    out.market_opportunity = 'AI 视觉质检技术成熟，制造业数字化转型需求强烈'
  }
  if (/Agent|AI|智能/.test(t) && !out.strategy_alignment) {
    out.strategy_alignment = '符合公司 AI 产品化与行业智能化战略方向'
  }
  if (/总监|工厂|客户|B端|企业/.test(t) && !out.target_customers) out.target_customers = t.slice(0, 100)
  if (/SaaS|订阅|付费|万\s*\/\s*年/.test(t) && !out.pricing_hypothesis) out.pricing_hypothesis = t.slice(0, 80)

  if (!out.project_name && out.project_idea && out.project_idea.length > 4) {
    const short = out.project_idea.replace(/面向|针对|我们想做|我想做|想做一个/g, '').slice(0, 16).trim()
    out.project_name = short.includes('Agent') || short.includes('平台') ? short : `${short}`
  }

  if (!out.proposer && /产品部|研发部|AI部/.test(t)) {
    const dept = t.match(/(产品部|研发部|AI部|技术部)/)?.[1]
    if (dept) out.proposer = `${dept}-待补充`
  }

  return out
}

export function buildFollowUpQuestion(phase: PhaseId, missing: string[]): string {
  const phaseTitle = PHASES.find((p) => p.id === phase)?.title || phase
  const labels = missing.map((f) => FIELD_LABELS[f] || f)

  if (missing.length === 0) return ''

  if (missing.length === 1) {
    return `好的。关于「${phaseTitle}」，还需要补充一下${labels[0]}，你可以直接用自然语言描述。`
  }

  return `收到。为了完成「${phaseTitle}」，还需要了解：${labels.join('、')}。可以一次说完，我会自动整理。`
}

export const WELCOME_MESSAGE = `你好，我是立项智能助手。

在**同一个对话窗口**里，你可以自由聊任何立项话题——不必按顺序一步步来。

例如一次说完：
「产品部-张三，制造业 AI 质检 Agent，预算 100-200 万，6 个月 MVP，主要竞品海康和阿丘…」

左侧每个能力模块（建档、市场、竞品、产品…）相互独立。我会从对话中自动提取信息、生成对应材料。右侧可查看归档结果。`

export const PHASE_TRANSITION_HINTS: Record<string, string> = {
  background: '接下来我会了解项目背景和战略价值。',
  market: '接下来我会分析市场机会并生成《市场分析报告》。',
  competitive: '接下来我会做竞品分析。',
  product: '接下来我会整理产品方案。',
  technical: '接下来我会规划技术路线。',
  feasibility: '我将综合已有信息，自动生成可行性分析。',
  budget: '最后整理资源与预算。',
  approval: '全部材料就绪，你可以提交三级审批。',
}

export function isRuleQuestion(text: string): boolean {
  const t = text.trim()
  if (/[？?]$/.test(t)) return true
  return /规则|标准|制度|上限|审批流程|管理办法|合规|案例|参考|多少|能不能|是否可以/.test(t)
}
