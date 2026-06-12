import { knowledgeBase } from '../kb/index.js'
import type { KbType, PhaseId, RagResult } from '../types.js'

const PHASE_QUERIES: Partial<Record<PhaseId, { query: string; kbTypes?: KbType[] }>> = {
  setup: { query: '立项建档 基本信息 项目编号', kbTypes: ['policy_process'] },
  background: { query: '项目背景 机会 立项动机', kbTypes: ['policy_process'] },
  market: { query: '市场分析 市场规模 数据来源', kbTypes: ['standard_tech_compliance', 'policy_process'] },
  competitive: { query: '竞品分析 差异化 竞争格局', kbTypes: ['standard_tech_compliance'] },
  product: { query: '产品方案 MVP 功能范围', kbTypes: ['template_format', 'standard_tech_compliance'] },
  technical: { query: '技术路线 架构 合规 安全', kbTypes: ['standard_tech_compliance'] },
  feasibility: { query: '可行性分析 风险 PoC', kbTypes: ['standard_tech_compliance', 'policy_approval'] },
  budget: { query: '资源预算 人力 成本 ROI', kbTypes: ['policy_approval', 'policy_process'] },
  approval: { query: '三级审批 关注点 驳回原因', kbTypes: ['policy_approval'] },
  complete: { query: '归档 历史案例 参考', kbTypes: ['reference_case'] },
}

export interface ContextRuleItem {
  chunkId: string
  docId: string
  title: string
  kbType: string
  excerpt: string
  score: number
}

export function getContextRulesForPhase(
  phaseId: PhaseId | null | undefined,
  projectTitle?: string,
): ContextRuleItem[] {
  const spec = phaseId ? PHASE_QUERIES[phaseId] : undefined
  const query = spec?.query ?? '立项制度 流程规范 材料要求'
  const kbTypes = spec?.kbTypes

  const enrichedQuery = projectTitle ? `${query} ${projectTitle}` : query
  const results = knowledgeBase.search(enrichedQuery, {
    kbTypes,
    limit: 5,
  })

  return results.map((r: RagResult) => ({
    chunkId: r.chunkId,
    docId: r.docId,
    title: r.title,
    kbType: r.kbType,
    excerpt: r.content.slice(0, 220).replace(/\s+/g, ' ').trim() + (r.content.length > 220 ? '…' : ''),
    score: r.score,
  }))
}
