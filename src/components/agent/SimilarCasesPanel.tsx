import { Button } from 'antd'
import { ReloadOutlined, BookOutlined } from '@ant-design/icons'
import type { SimilarCase } from '../../types'

interface Props {
  cases: SimilarCase[]
  loading?: boolean
  onRefresh: () => void
  onApplyCase: (hint: string) => void
}

const OUTCOME_LABEL: Record<string, string> = {
  approved: '已通过',
  conditional: '附条件',
  rejected: '已驳回',
  pending: '进行中',
}

export default function SimilarCasesPanel({ cases, loading, onRefresh, onApplyCase }: Props) {
  return (
    <div className="similar-cases-panel">
      <div className="similar-cases-header">
        <div>
          <strong>
            <BookOutlined /> 历史案例参考
          </strong>
          <span>归档立项自动入库，智能匹配相似项目</span>
        </div>
        <Button size="small" icon={<ReloadOutlined />} loading={loading} onClick={onRefresh}>
          匹配
        </Button>
      </div>

      {cases.length === 0 ? (
        <p className="similar-cases-empty">
          暂无相似案例。项目归档后将写入历史参考库，供后续立项复用。
        </p>
      ) : (
        <ul className="similar-cases-list">
          {cases.map((c) => (
            <li key={c.id} className="similar-case-card">
              <div className="similar-case-head">
                <strong>{c.title}</strong>
                <span className="similar-case-score">匹配 {c.score.toFixed(1)}</span>
              </div>
              <p>{c.snippet}</p>
              <div className="similar-case-meta">
                {c.projectType && <span>{c.projectType}</span>}
                {c.budget && <span>{c.budget}</span>}
                {c.outcome && (
                  <span className={`similar-case-outcome ${c.outcome}`}>
                    {OUTCOME_LABEL[c.outcome] || c.outcome}
                  </span>
                )}
                <span className="similar-case-source">{c.source === 'kb' ? '知识库' : '归档项目'}</span>
              </div>
              <Button
                size="small"
                type="link"
                onClick={() =>
                  onApplyCase(
                    `请参考历史立项案例「${c.title}」的论证结构与材料组织方式，结合我当前项目给出建议。`,
                  )
                }
              >
                参考此案例
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
