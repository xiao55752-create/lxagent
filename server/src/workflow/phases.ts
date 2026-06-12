import type { PhaseId, PhaseStatus } from '../types.js'

export interface PhaseDef {
  id: PhaseId
  title: string
  reportKey?: string
  reportTitle?: string
}

export interface QuestionDef {
  id: string
  text: string
}

export const PHASES: PhaseDef[] = [
  { id: 'setup', title: '项目建档' },
  { id: 'background', title: '背景与机会' },
  { id: 'market', title: '市场分析', reportKey: 'market', reportTitle: '市场分析报告' },
  { id: 'competitive', title: '竞品分析', reportKey: 'competitive', reportTitle: '竞品分析报告' },
  { id: 'product', title: '产品方案', reportKey: 'product', reportTitle: '产品解决方案' },
  { id: 'technical', title: '技术路线', reportKey: 'technical', reportTitle: '技术路线方案' },
  { id: 'feasibility', title: '可行性分析', reportKey: 'feasibility', reportTitle: '项目可行性分析报告' },
  { id: 'budget', title: '资源预算', reportKey: 'budget', reportTitle: '资源与预算' },
  { id: 'approval', title: '三级审批' },
  { id: 'complete', title: '立项完成' },
]

export const REPORT_PHASES = ['market', 'competitive', 'product', 'technical', 'feasibility', 'budget']

export const PHASE_QUESTIONS: Record<string, QuestionDef[]> = {
  setup: [
    { id: 'project_idea', text: '请用一句话描述你的项目想法：' },
    { id: 'project_name', text: '项目名称是什么？' },
    { id: 'proposer', text: '提出人/部门是？' },
    { id: 'project_type', text: '项目类型是？（新品/产品迭代/平台能力/内部工具）' },
    { id: 'expected_start', text: '期望启动时间？' },
    { id: 'duration', text: '预计项目周期？' },
  ],
  background: [
    { id: 'pain_point', text: '当前业务/客户最大的痛点是什么？谁受影响？' },
    { id: 'market_opportunity', text: '市场上出现了什么新机会，让你们觉得「现在该做」？' },
    { id: 'strategy_alignment', text: '这个项目和公司战略目标的契合点是什么？' },
    { id: 'cost_of_inaction', text: '如果 6-12 个月内不做，最大的风险或机会成本是什么？' },
    { id: 'core_assumptions', text: '本项目成立的核心假设是什么？' },
  ],
  market: [
    { id: 'target_market', text: '目标市场是哪个行业/细分赛道？' },
    { id: 'target_customers', text: '目标客户是谁？' },
    { id: 'current_solution', text: '客户目前怎么解决这个问题？成本大约多少？' },
    { id: 'pricing_hypothesis', text: '你认为客户愿意为此付多少钱？什么付费模式？' },
  ],
  competitive: [
    { id: 'known_competitors', text: '你知道的直接竞品有哪些？' },
    { id: 'alternatives', text: '客户如果不选你们，通常会用什么替代方案？' },
    { id: 'differentiation', text: '你认为最大的差异化机会在哪里？' },
    { id: 'entry_barriers', text: '进入这个市场的最大壁垒是什么？' },
  ],
  product: [
    { id: 'value_proposition', text: '用一句话描述产品价值主张' },
    { id: 'use_cases', text: '核心使用场景是什么？' },
    { id: 'mvp_features', text: '第一版（MVP）必须有哪些功能？' },
    { id: 'out_of_scope', text: '明确第一版不做什么？' },
    { id: 'delivery_form', text: '产品交付形态？' },
    { id: 'success_metrics', text: '怎样算产品成功？（量化指标）' },
  ],
  technical: [
    { id: 'existing_capabilities', text: '团队现有技术栈和能力？' },
    { id: 'tech_preferences', text: '有没有倾向的技术选型？' },
    { id: 'tech_challenges', text: '你认为最大的技术难点是什么？' },
    { id: 'mvp_timeline', text: 'MVP 希望多久交付？' },
    { id: 'team_size', text: '需要多少研发人力？' },
  ],
  feasibility: [],
  budget: [
    { id: 'team_config', text: '团队配置是否已有？还需招聘哪些角色？' },
    { id: 'budget_range', text: '预算上限或区间？' },
    { id: 'phased_investment', text: '是否建议分期投入？止损点在哪？' },
  ],
}

export const PHASE_INTROS: Record<string, string> = {
  setup: '你好！我是立项流程助手。我将按公司立项规范引导你完成信息采集与材料归档。\n\n先从项目基本信息开始。',
  background: '项目档案已创建。进入 **背景与机会** 采集节点。',
  market: '进入 **市场分析** 节点。完成采集后将生成材料并归档至本项目。',
  competitive: '进入 **竞品分析** 节点。',
  product: '进入 **产品方案** 节点。',
  technical: '进入 **技术路线** 节点。',
  feasibility: '正在综合前序材料，生成 **可行性分析** 材料...',
  budget: '进入 **资源与预算** 节点。',
  approval: '全部材料已就绪，可提交三级审批。',
  complete: '立项流程已完成，材料已归档。可进入项目执行阶段。',
}

export function initialPhaseStatuses(): Record<PhaseId, PhaseStatus> {
  const s = {} as Record<PhaseId, PhaseStatus>
  for (const p of PHASES) s[p.id] = 'pending'
  return s
}
