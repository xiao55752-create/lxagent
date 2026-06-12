import { useEffect, useState } from 'react'
import { MessageOutlined, BookOutlined, FormOutlined } from '@ant-design/icons'
import { api, type KbDocument } from '../../api/client'
import type { InitiationProject, Material } from '../../types'
import { FIELD_LABELS } from '../../data/fieldLabels'

const KB_TYPE_LABELS: Record<string, string> = {
  policy_process: '立项制度',
  policy_approval: '审批规则',
  standard_tech_compliance: '技术合规',
  template_format: '报告模板',
  reference_case: '历史参考',
}

interface Props {
  project: InitiationProject
  material: Material
  onJumpToMessage?: (messageId: string) => void
}

export default function MaterialTracePanel({ project, material, onJumpToMessage }: Props) {
  const [docs, setDocs] = useState<KbDocument[]>([])
  const prov = material.provenance
  const docIds = prov?.sourceDocIds?.length ? prov.sourceDocIds : material.sourceDocIds

  useEffect(() => {
    if (!docIds.length) return
    api.listKbDocuments().then(({ documents }) => {
      setDocs(documents.filter((d) => docIds.includes(d.id)))
    })
  }, [docIds.join(',')])

  const chatSources = (prov?.chatMessageIds || [])
    .map((id) => project.messages.find((m) => m.id === id))
    .filter(Boolean)

  const fieldEntries = prov?.answerFields?.length
    ? prov.answerFields.map((key) => ({
        key,
        label: FIELD_LABELS[key] || key,
        value: prov.fieldSnapshots[key] || project.answers[key] || '',
      }))
    : []

  if (!prov && !docIds.length) {
    return (
      <div className="material-trace-panel empty">
        <p>该材料为旧版本生成，重新生成后将显示完整溯源信息。</p>
      </div>
    )
  }

  return (
    <div className="material-trace-panel">
      <div className="material-trace-header">
        <span>材料溯源</span>
        <em>对话 · 字段 · 规则依据</em>
      </div>

      {chatSources.length > 0 && (
        <section className="trace-section">
          <h4>
            <MessageOutlined /> 对话来源
          </h4>
          <ul>
            {chatSources.map((m) => (
              <li key={m!.id}>
                <button
                  type="button"
                  className="trace-link-btn"
                  onClick={() => onJumpToMessage?.(m!.id)}
                >
                  {m!.content.slice(0, 72)}
                  {m!.content.length > 72 ? '…' : ''}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {fieldEntries.length > 0 && (
        <section className="trace-section">
          <h4>
            <FormOutlined /> 采集字段
          </h4>
          <ul className="trace-fields">
            {fieldEntries.map((f) => (
              <li key={f.key}>
                <strong>{f.label}</strong>
                <span>{f.value}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {(docs.length > 0 || docIds.length > 0) && (
        <section className="trace-section">
          <h4>
            <BookOutlined /> 规则依据
          </h4>
          <ul>
            {(docs.length
              ? docs
              : docIds.map((id) => ({ id, title: id, kbType: '', content: '' }))
            ).map((d) => (
              <li key={d.id} className="trace-kb-item">
                {d.kbType && (
                  <span className="trace-kb-tag">{KB_TYPE_LABELS[d.kbType] || d.kbType}</span>
                )}
                <strong>{d.title}</strong>
                {d.content && <p>{d.content.slice(0, 80)}…</p>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
