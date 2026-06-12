import { useEffect, useState } from 'react'
import { api } from '../../api/client'
import type { ContextRuleItem, PhaseId } from '../../types'

const KB_LABELS: Record<string, string> = {
  policy_process: '流程制度',
  policy_approval: '审批规则',
  standard_tech_compliance: '技术合规',
  template_format: '模板格式',
  reference_case: '历史案例',
}

interface Props {
  projectId: string
  focusPhase?: PhaseId | null
  currentPhase: PhaseId
  onOpenDoc: (docId: string, excerpt?: string) => void
  onQuoteToChat: (text: string) => void
}

function buildRuleQuote(rule: ContextRuleItem) {
  return `【引用规则：《${rule.title}》】\n${rule.excerpt}\n\n请结合当前立项分析是否符合，并给出改进建议。`
}

export default function ContextRulesPanel({
  projectId,
  focusPhase,
  currentPhase,
  onOpenDoc,
  onQuoteToChat,
}: Props) {
  const [rules, setRules] = useState<ContextRuleItem[]>([])
  const [loading, setLoading] = useState(false)

  const phase = focusPhase ?? currentPhase

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    api
      .getContextRules(projectId)
      .then(({ rules: items }) => {
        if (!cancelled) setRules(items)
      })
      .catch(() => {
        if (!cancelled) setRules([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [projectId, phase])

  if (loading && !rules.length) {
    return (
      <div className="context-rules-panel loading">
        <span>📚 加载相关规则...</span>
      </div>
    )
  }

  if (!rules.length) return null

  return (
    <div className="context-rules-panel">
      <div className="context-rules-header">
        <span>📚 当前模块相关规则</span>
        <em>引用到对话或查看全文</em>
      </div>
      <ul className="context-rules-list">
        {rules.map((r) => (
          <li key={r.chunkId} className="context-rules-item">
            <div className="context-rules-item-head">
              <strong>{r.title}</strong>
              <span className="context-rules-tag">{KB_LABELS[r.kbType] || r.kbType}</span>
            </div>
            <p>{r.excerpt}</p>
            <div className="context-rules-actions">
              <button type="button" className="context-rules-action" onClick={() => onQuoteToChat(buildRuleQuote(r))}>
                引用到对话
              </button>
              <button type="button" className="context-rules-action primary" onClick={() => onOpenDoc(r.docId, r.excerpt)}>
                查看全文
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
