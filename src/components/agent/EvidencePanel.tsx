import { useEffect, useState } from 'react'
import { api, type KbDocument } from '../../api/client'

const KB_TYPE_LABELS: Record<string, string> = {
  policy_process: '立项制度',
  policy_approval: '审批规则',
  standard_tech_compliance: '技术合规',
  template_format: '报告模板',
  reference_case: '历史参考',
}

interface Props {
  ruleRefDocIds: string[]
  onOpenDoc?: (docId: string, excerpt?: string) => void
}

export default function EvidencePanel({ ruleRefDocIds, onOpenDoc }: Props) {
  const [docs, setDocs] = useState<KbDocument[]>([])

  useEffect(() => {
    if (!ruleRefDocIds.length) return
    api.listKbDocuments().then(({ documents }) => {
      setDocs(documents.filter((d) => ruleRefDocIds.includes(d.id)))
    })
  }, [ruleRefDocIds])

  if (!ruleRefDocIds.length) {
    return (
      <div className="evidence-panel empty">
        <div className="evidence-panel-icon">📚</div>
        <p>智能体引用规则/标准后，依据来源会显示在这里</p>
      </div>
    )
  }

  return (
    <div className="evidence-panel">
      <div className="evidence-panel-header">
        <span>📚 引用依据</span>
        <span className="evidence-count">{docs.length || ruleRefDocIds.length} 条</span>
      </div>
      <ul className="evidence-list">
        {(docs.length ? docs : ruleRefDocIds.map((id) => ({ id, title: id, kbType: '', content: '' }))).map(
          (d) => (
            <li key={d.id}>
              <button
                type="button"
                className="evidence-item evidence-item-btn"
                onClick={() => onOpenDoc?.(d.id, d.content?.slice(0, 120))}
                disabled={!onOpenDoc}
              >
                <div className="evidence-item-head">
                  {d.kbType && <span className="evidence-tag">{KB_TYPE_LABELS[d.kbType] || d.kbType}</span>}
                  <strong>{d.title}</strong>
                </div>
                {d.content && <p>{d.content.slice(0, 100)}…</p>}
              </button>
            </li>
          ),
        )}
      </ul>
    </div>
  )
}
