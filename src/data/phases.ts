import type { PhaseDefinition, QuestionDef } from '../types'

export const PHASES: PhaseDefinition[] = [
  { id: 'setup', title: '项目建档', subtitle: '基本信息确认', icon: '📋' },
  { id: 'background', title: '背景与机会', subtitle: '为什么做', icon: '💡' },
  {
    id: 'market',
    title: '市场分析',
    subtitle: '市场规模与趋势',
    icon: '📊',
    reportKey: 'market',
    reportTitle: '市场分析报告',
  },
  {
    id: 'competitive',
    title: '竞品分析',
    subtitle: '竞争格局与差异化',
    icon: '⚔️',
    reportKey: 'competitive',
    reportTitle: '竞品分析报告',
  },
  {
    id: 'product',
    title: '产品方案',
    subtitle: 'MVP 与功能规划',
    icon: '🎯',
    reportKey: 'product',
    reportTitle: '产品解决方案',
  },
  {
    id: 'technical',
    title: '技术路线',
    subtitle: '架构与里程碑',
    icon: '🔧',
    reportKey: 'technical',
    reportTitle: '技术路线方案',
  },
  {
    id: 'feasibility',
    title: '可行性分析',
    subtitle: '综合评估',
    icon: '✅',
    reportKey: 'feasibility',
    reportTitle: '项目可行性分析报告',
  },
  { id: 'budget', title: '资源预算', subtitle: '人力与投入', icon: '💰', reportKey: 'budget', reportTitle: '资源与预算' },
  { id: 'approval', title: '三级审批', subtitle: '提交审批', icon: '📝' },
  { id: 'complete', title: '立项完成', subtitle: '进入执行', icon: '🚀' },
]

export const PHASE_QUESTIONS: Record<string, QuestionDef[]> = {
  setup: [
    {
      id: 'project_idea',
      text: '请用一句话描述你的项目想法：',
      placeholder: '例如：面向制造业的 AI 质检 Agent，用视觉识别替代人工抽检',
      suggestions: [
        '面向制造业的 AI 质检 Agent，用视觉识别替代人工抽检',
        '企业内部知识库 RAG 问答助手，提升研发效率',
        '面向 SaaS 客户的智能客服 Agent 平台',
      ],
    },
    {
      id: 'project_name',
      text: '项目名称是什么？（也可让我帮你拟定）',
      placeholder: '例如：智检 Agent 平台',
    },
    {
      id: 'proposer',
      text: '提出人/部门是？',
      placeholder: '例如：产品部 - 张三',
    },
    {
      id: 'project_type',
      text: '项目类型是？',
      type: 'select',
      options: ['新品', '产品迭代', '平台能力', '内部工具'],
    },
    {
      id: 'expected_start',
      text: '期望启动时间？',
      type: 'select',
      options: ['2026 Q2', '2026 Q3', '2026 Q4', '2027 Q1'],
    },
    {
      id: 'duration',
      text: '预计项目周期？',
      type: 'select',
      options: ['3 个月', '6 个月', '12 个月', '18 个月'],
    },
  ],
  background: [
    {
      id: 'pain_point',
      text: '当前业务/客户最大的痛点是什么？谁受影响？',
      placeholder: '描述具体痛点和影响人群',
    },
    {
      id: 'market_opportunity',
      text: '市场上出现了什么新机会，让你们觉得「现在该做」？',
      placeholder: '技术成熟、政策变化、客户需求等',
    },
    {
      id: 'strategy_alignment',
      text: '这个项目和公司战略目标的契合点是什么？',
      placeholder: '与公司年度/季度目标的关联',
    },
    {
      id: 'cost_of_inaction',
      text: '如果 6-12 个月内不做，最大的风险或机会成本是什么？',
    },
    {
      id: 'core_assumptions',
      text: '本项目成立的核心假设是什么？（可列出 1-3 条）',
      placeholder: '例如：制造业愿意为 AI 质检付费',
    },
  ],
  market: [
    {
      id: 'target_market',
      text: '目标市场是哪个行业/细分赛道？',
      placeholder: '例如：制造业 - 电子组装质检',
    },
    {
      id: 'target_customers',
      text: '目标客户是谁？（规模、行业、决策角色）',
      placeholder: '例如：年营收 1-10 亿的电子制造工厂，质量总监',
    },
    {
      id: 'current_solution',
      text: '客户目前怎么解决这个问题？成本大约多少？',
    },
    {
      id: 'pricing_hypothesis',
      text: '你认为客户愿意为此付多少钱？什么付费模式？',
      placeholder: '例如：SaaS 订阅 10-30 万/年/工厂',
    },
  ],
  competitive: [
    {
      id: 'known_competitors',
      text: '你知道的直接竞品有哪些？（可只列名字）',
      placeholder: '例如：海康威视、阿丘科技',
    },
    {
      id: 'alternatives',
      text: '客户如果不选你们，通常会用什么替代方案？',
    },
    {
      id: 'differentiation',
      text: '你认为最大的差异化机会在哪里？',
    },
    {
      id: 'entry_barriers',
      text: '进入这个市场的最大壁垒是什么？',
      placeholder: '技术、品牌、渠道、数据等',
    },
  ],
  product: [
    {
      id: 'value_proposition',
      text: '用一句话描述产品价值主张（客户为什么选你）',
    },
    {
      id: 'use_cases',
      text: '核心使用场景是什么？（描述 1-2 个典型场景）',
    },
    {
      id: 'mvp_features',
      text: '第一版（MVP）必须有哪些功能？',
    },
    {
      id: 'out_of_scope',
      text: '明确第一版不做什么？',
    },
    {
      id: 'delivery_form',
      text: '产品交付形态？',
      type: 'select',
      options: ['Web SaaS', 'App', 'API 平台', '私有化部署', '软硬一体'],
    },
    {
      id: 'success_metrics',
      text: '怎样算产品成功？（量化指标）',
      placeholder: '例如：3 个月内 5 家付费客户',
    },
  ],
  technical: [
    {
      id: 'existing_capabilities',
      text: '团队现有技术栈和能力？',
      placeholder: '例如：Python、CV 模型训练、无硬件经验',
    },
    {
      id: 'tech_preferences',
      text: '有没有倾向的技术选型？',
      placeholder: '例如：Azure、GPT-4V',
    },
    {
      id: 'tech_challenges',
      text: '你认为最大的技术难点是什么？',
    },
    {
      id: 'mvp_timeline',
      text: 'MVP 希望多久交付？',
      type: 'select',
      options: ['2 个月', '3 个月', '4 个月', '6 个月'],
    },
    {
      id: 'team_size',
      text: '需要多少研发人力？',
      type: 'select',
      options: ['不确定，请帮我估算', '3-5 人', '5-8 人', '8-12 人'],
    },
  ],
  feasibility: [],
  budget: [
    {
      id: 'team_config',
      text: '团队配置是否已有？还需招聘哪些角色？',
    },
    {
      id: 'budget_range',
      text: '预算上限或区间？',
      placeholder: '例如：100-200 万',
    },
    {
      id: 'phased_investment',
      text: '是否建议分期投入？止损点在哪？',
    },
  ],
}

export const PHASE_INTROS: Record<string, string> = {
  setup:
    '你好！我是项目立项智能助手。接下来我会引导你完成立项材料，预计 20-30 分钟，分 7 个阶段。\n\n让我们从项目基本信息开始。',
  background:
    '很好，项目档案已创建。现在进入 **背景与机会** 阶段，我需要了解「为什么做这个项目」。',
  market:
    '接下来进入 **市场分析** 阶段。我会根据你的回答生成《市场分析报告》，并检索公开市场数据。',
  competitive:
    '进入 **竞品分析** 阶段。我会补充竞品信息，并生成功能对比矩阵和 SWOT 分析。',
  product:
    '进入 **产品解决方案** 阶段。我会帮你梳理 MVP 范围、功能优先级和成功指标。',
  technical:
    '进入 **技术路线** 阶段。我会基于 MVP 需求给出架构方案、技术选型和里程碑计划。',
  feasibility:
    '正在综合前 5 份材料，自动生成 **可行性分析**...',
  budget:
    '最后一步：**资源与预算**。我会根据技术路线估算预算明细。',
  approval:
    '立项材料已全部完成！你可以查看完整报告，并提交三级审批。',
  complete: '🎉 恭喜！项目立项已通过，可以进入执行阶段。',
}
