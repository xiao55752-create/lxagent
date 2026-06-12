import { knowledgeBase } from '../kb/index.js'
import { chatCompletion, formatRagContext, isLlmConfigured } from '../llm/client.js'
import type { GenerateReportRequest, GenerateReportResponse, RagResult } from '../types.js'

const PHASE_KB_TYPES: Record<string, Array<RagResult['kbType']>> = {
  market: ['reference_case', 'policy_process', 'template_format'],
  competitive: ['reference_case', 'template_format', 'policy_process'],
  product: ['reference_case', 'template_format', 'policy_process'],
  technical: ['standard_tech_compliance', 'template_format', 'reference_case'],
  feasibility: ['policy_process', 'policy_approval', 'reference_case', 'template_format'],
  budget: ['reference_case', 'policy_process', 'policy_approval'],
}

const PHASE_TITLES: Record<string, string> = {
  market: '市场分析报告',
  competitive: '竞品分析报告',
  product: '产品解决方案',
  technical: '技术路线方案',
  feasibility: '项目可行性分析报告',
  budget: '资源与预算',
}

function buildQuery(phase: string, answers: Record<string, string>, meta: GenerateReportRequest['meta']) {
  const parts = [PHASE_TITLES[phase] || phase, meta?.name, meta?.projectType]
  const answerText = Object.entries(answers)
    .map(([k, v]) => `${k}: ${v}`)
    .join(' ')
  return `${parts.filter(Boolean).join(' ')} ${answerText}`.slice(0, 500)
}

function validateConsistency(
  phase: string,
  answers: Record<string, string>,
  reports: Record<string, string>,
): string[] {
  const warnings: string[] = []

  if (phase === 'feasibility' && reports.market) {
    const somMatch = reports.market.match(/SOM[^0-9]*([\d,.]+)\s*万/)
    const budgetAnswer = answers.budget_range || ''
    if (somMatch && budgetAnswer.includes('100') && Number(somMatch[1].replace(/,/g, '')) > 3000) {
      warnings.push('市场 SOM 目标较高，但预算区间偏低，建议核对投入与产出预期。')
    }
  }

  if (phase === 'product' && answers.mvp_timeline && reports.technical) {
    if (answers.mvp_timeline.includes('2') && reports.technical.includes('8 周')) {
      warnings.push('MVP 交付期望与技术路线里程碑存在时间差异，请确认。')
    }
  }

  return warnings
}

function ragTemplateReport(
  phase: string,
  answers: Record<string, string>,
  sources: RagResult[],
  meta: GenerateReportRequest['meta'],
): string {
  const ctx = sources.map((s) => `- ${s.content}`).join('\n')
  const answerBlock = Object.entries(answers)
    .map(([k, v]) => `- **${k}**：${v}`)
    .join('\n')

  const sourceRefs = sources.length
    ? sources.map((s) => `[来源: ${s.title}]`).join('、')
    : '[confidence: estimated]'

  switch (phase) {
    case 'market':
      return `# 市场分析报告

## 1. 目标市场定义
${answers.target_market || '待补充'}

## 2. 目标客户画像
${answers.target_customers || '待补充'}

## 3. 市场规模估算
基于知识库检索 ${sourceRefs}：

${ctx || '暂无行业数据，建议补充行业报告。'}

| 指标 | 参考值 | 说明 |
|------|--------|------|
| TAM | 800 亿元 | [来源: 2025 中国制造业 AI 视觉检测市场报告] |
| SAM | 120 亿元 | [来源: 2025 中国制造业 AI 视觉检测市场报告] |
| SOM | 待确认 | [confidence: estimated] |

## 4. 客户付费模式
${answers.pricing_hypothesis || '待补充'} [confidence: user_input]

## 5. 用户采集信息
${answerBlock}

## 6. 关键结论
1. 电子组装质检为高机会赛道
2. 客户对快速部署与 Agent 化交互需求明确
3. 销售周期需预留 4-8 个月`

    case 'competitive':
      return `# 竞品分析报告

## 1. 竞争格局
${ctx || '请补充竞品情报库内容。'}

## 2. 用户提供的竞品
${answers.known_competitors || '待补充'}

## 3. 差异化机会
${answers.differentiation || '待补充'} [confidence: user_input]

## 4. 进入壁垒
${answers.entry_barriers || '待补充'}

## 5. 功能对比矩阵（摘要）
| 维度 | 竞品典型 | 我方计划 |
|------|---------|---------|
| 部署周期 | 1-6 月 | 2 周 |
| Agent 交互 | 弱/无 | 有 |
| SaaS 模式 | 部分 | 完整 |

## 6. 引用来源
${sourceRefs}`

    case 'product':
      return `# 产品解决方案

## 1. 产品定位
${answers.value_proposition || meta?.name || '待补充'}

## 2. 核心场景
${answers.use_cases || '待补充'}

## 3. MVP 范围
**包含**：${answers.mvp_features || '待补充'}
**不包含**：${answers.out_of_scope || '待补充'}

## 4. 交付形态
${answers.delivery_form || 'Web SaaS'}

## 5. 成功指标
${answers.success_metrics || '待补充'}

## 6. 参考知识
${ctx || '无'} ${sourceRefs}`

    case 'technical':
      return `# 技术路线方案

## 1. 团队现有能力
${answers.existing_capabilities || '待补充'} [confidence: user_input]

## 2. 技术偏好
${answers.tech_preferences || '无特殊偏好'}

## 3. 技术难点
${answers.tech_challenges || '待补充'}

## 4. 推荐架构（基于技术规范）
${ctx || '参考公司技术架构规范进行设计。'}

## 5. 里程碑
| 阶段 | 周期 | 目标 |
|------|------|------|
| PoC | 4 周 | 验证核心指标 |
| MVP | ${answers.mvp_timeline || '3 个月'} | 试点客户 |
| V1 | 6 月 | 规模化 |

## 6. 人力估算
${answers.team_size || '需进一步评估'}

## 引用
${sourceRefs}`

    case 'feasibility':
      return `# 项目可行性分析报告

## 1. 商业可行性
- 首年投入需结合预算阶段进一步确认
- 参考历史案例 PRJ-2025-032：预算 180 万，实际 195 万

## 2. 技术可行性
${answers.existing_capabilities ? `团队具备：${answers.existing_capabilities}` : '待评估'}

## 3. 运营可行性
制造业销售周期通常 4-8 个月 [来源: 2025 中国制造业 AI 视觉检测市场报告]

## 4. 风险清单
| 风险 | 概率 | 影响 | 应对 |
|------|------|------|------|
| 销售周期长 | 高 | 高 | 标杆客户策略 |
| CV 精度不达标 | 中 | 高 | PoC 严格验证 |
| 竞品压力 | 中 | 中 | 聚焦差异化 |

## 5. 审批规则参考
${ctx || ''}

## 6. 综合结论
**建议立项（附条件）**

## 7. 前提条件
1. PoC 验证核心精度指标
2. 锁定 2 家标杆试点意向
3. MVP 预算可控

${sourceRefs}`

    case 'budget':
      return `# 资源与预算

## 1. 团队配置
${answers.team_config || '待补充'}

## 2. 预算区间（用户提供）
${answers.budget_range || '待补充'} [confidence: user_input]

## 3. 参考历史项目
${ctx || '参考 PRJ-2025-032：180 万预算，实际 195 万。'}

## 4. 建议预算明细
| 类别 | 金额（万元） |
|------|------------|
| 人力 | 150-180 |
| 云/算力 | 20-30 |
| 第三方 | 10-15 |
| 市场/试点 | 15-20 |
| **合计** | **195-245** |

## 5. 分期投入
${answers.phased_investment || '建议 PoC 50 万 → MVP 100 万 → V1 80 万'}

## 6. 决策建议
建议附条件立项，按里程碑释放预算。

${sourceRefs}`

    default:
      return `# ${PHASE_TITLES[phase] || '报告'}\n\n${answerBlock}\n\n${ctx}`
  }
}

const SYSTEM_PROMPT = `你是科技公司项目立项专家。根据用户采集信息和知识库检索结果，生成专业、结构化的立项报告章节。
规则：
1. 使用 Markdown 格式
2. 知识库有依据的数据必须标注 [来源: 文档标题]
3. 估算数据标注 [confidence: estimated]
4. 用户提供的数据标注 [confidence: user_input]
5. 不编造无法支撑的精确数字，可用区间
6. 面向管理层，结论先行，语言专业简洁`

export async function generateReport(
  req: GenerateReportRequest,
): Promise<GenerateReportResponse> {
  const { phase, answers, meta, reports } = req
  const query = buildQuery(phase, answers, meta)
  const kbTypes = PHASE_KB_TYPES[phase]
  const sources = knowledgeBase.search(query, { kbTypes, limit: 5 })
  const warnings = validateConsistency(phase, answers, reports)

  if (isLlmConfigured()) {
    try {
      const userPrompt = `# 任务
生成《${PHASE_TITLES[phase]}》

# 项目信息
${JSON.stringify(meta, null, 2)}

# 用户采集
${JSON.stringify(answers, null, 2)}

# 已有报告摘要
${Object.keys(reports).join(', ') || '无'}

# 知识库检索
${formatRagContext(sources)}

请输出完整 Markdown 报告。`

      const markdown = await chatCompletion(SYSTEM_PROMPT, userPrompt)
      return { markdown, sources, warnings, mode: 'llm' }
    } catch (e) {
      console.warn('LLM generation failed, fallback to RAG template:', e)
    }
  }

  const markdown = ragTemplateReport(phase, answers, sources, meta)
  return { markdown, sources, warnings, mode: 'rag-template' }
}

export async function askAssistant(
  question: string,
  projectContext?: { meta?: GenerateReportRequest['meta']; answers?: Record<string, string>; phase?: string },
): Promise<{ answer: string; sources: RagResult[] }> {
  const query = [question, projectContext?.meta?.name, projectContext?.phase].filter(Boolean).join(' ')
  const sources = knowledgeBase.search(query, { limit: 5 })

  if (isLlmConfigured()) {
    const system = `你是项目立项 AI 助手。结合知识库回答用户问题。必须标注信息来源或说明"暂无知识库依据"。`
    const user = `# 用户问题\n${question}\n\n# 当前项目\n${JSON.stringify(projectContext || {}, null, 2)}\n\n# 知识库\n${formatRagContext(sources)}`
    const answer = await chatCompletion(system, user)
    return { answer, sources }
  }

  if (!sources.length) {
    return {
      answer: '知识库中暂无相关内容。你可以上传行业报告或历史立项文档后我再检索回答。',
      sources,
    }
  }

  const answer = `根据知识库检索，找到以下相关内容：\n\n${sources
    .map((s, i) => `${i + 1}. **${s.title}**\n${s.content.slice(0, 300)}...\n[来源: ${s.title}]`)
    .join('\n\n')}`

  return { answer, sources }
}

export function generateApprovalViews(meta: { name: string; proposer: string }) {
  const approvalSources = knowledgeBase.search('三级审批 关注点 驳回', {
    kbTypes: ['policy_approval'],
    limit: 3,
  })

  const rulesRef = approvalSources.length
    ? approvalSources.map((s) => s.content.slice(0, 200)).join('\n')
    : ''

  return {
    level1: `# 一级审批视图 · 部门负责人

## 项目概述
**${meta.name}** — 请部门负责人评估资源与部门目标契合度。

## 本部门资源需求
- 请结合预算阶段材料确认
- 需协调跨部门资源时提前说明

## 审批参考
${rulesRef}

## 建议
☑ 建议审阅后决策`,

    level2: `# 二级审批视图 · 产品/技术委员会

## 审查范围
完整 5 份报告 + 可行性分析 + 一致性校验结果

## 委员会关注
- 市场机会与数据依据
- 技术路线可行性
- 差异化与 ROI

## 审批参考
${rulesRef}`,

    level3: `# 三级审批视图 · 公司决策层

## 决策摘要
- 战略价值与年度目标对齐
- 总投入与预期回报
- Top 3 风险与止损方案

## 审批参考
${rulesRef}

## 综合建议
请决策层给出 Go / Conditional Go / No Go`,
  }
}
