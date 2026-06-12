import type { AgentAction } from '../../types'

const KB_TYPE_LABELS: Record<string, string> = {
  policy_process: '流程制度',
  policy_approval: '审批规则',
  standard_tech_compliance: '技术合规',
  template_format: '报告模板',
  reference_case: '历史案例',
}

interface Props {
  actions: AgentAction[]
  onOpenDoc?: (docId: string, excerpt?: string) => void
}

export default function RuleCitationChips({ actions, onOpenDoc }: Props) {
  const citations = actions.filter((a) => a.type === 'evidence' && a.meta?.docId)
  if (!citations.length) return null

  return (
    <div className="rule-citation-chips">
      <span className="rule-citation-label">规则依据</span>
      {citations.map((a, i) => (
        <button
          key={`${a.meta!.docId}-${i}`}
          type="button"
          className="rule-citation-chip"
          onClick={() => onOpenDoc?.(a.meta!.docId!, a.detail)}
        >
          <span className="rule-citation-chip-tag">
            {KB_TYPE_LABELS[a.meta?.kbType || ''] || '规则'}
          </span>
          {a.label.replace(/\s*\(\d+\)$/, '')}
        </button>
      ))}
    </div>
  )
}
