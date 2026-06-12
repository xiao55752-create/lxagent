import { Button } from 'antd'
import { ReloadOutlined } from '@ant-design/icons'
import type { GoNoGoAssessment, GoNoGoVerdict } from '../../types'

interface Props {
  assessment: GoNoGoAssessment | null | undefined
  loading?: boolean
  onRefresh: () => void
}

const VERDICT_CLASS: Record<GoNoGoVerdict, string> = {
  go: 'gonogo-go',
  conditional: 'gonogo-conditional',
  no_go: 'gonogo-no',
}

const STATUS_CLASS = {
  strong: 'dim-strong',
  moderate: 'dim-moderate',
  weak: 'dim-weak',
  unknown: 'dim-unknown',
}

export default function GoNoGoPanel({ assessment, loading, onRefresh }: Props) {
  return (
    <div className="gonogo-panel">
      <div className="gonogo-header">
        <div>
          <strong>Go / No-Go 立项评分</strong>
          <span>多维度投资决策参考</span>
        </div>
        <Button size="small" icon={<ReloadOutlined />} loading={loading} onClick={onRefresh}>
          刷新
        </Button>
      </div>

      {!assessment ? (
        <p className="gonogo-empty">对话补充项目信息后，系统将自动生成立项评分。</p>
      ) : (
        <>
          <div className={`gonogo-verdict ${VERDICT_CLASS[assessment.verdict]}`}>
            <div className="gonogo-score-ring">
              <span className="gonogo-score-num">{assessment.overallScore}</span>
              <span className="gonogo-score-unit">分</span>
            </div>
            <div className="gonogo-verdict-text">
              <strong>{assessment.verdictLabel}</strong>
              <p>{assessment.summary}</p>
              <em>{assessment.generatedBy === 'llm' ? 'LLM 增强' : '规则引擎'} · {assessment.assessedAt.slice(0, 16).replace('T', ' ')}</em>
            </div>
          </div>

          <div className="gonogo-dimensions">
            {assessment.dimensions.map((d) => (
              <div key={d.id} className={`gonogo-dim ${STATUS_CLASS[d.status]}`}>
                <div className="gonogo-dim-head">
                  <span>{d.label}</span>
                  <strong>{d.score}</strong>
                </div>
                <div className="gonogo-dim-bar">
                  <div className="gonogo-dim-fill" style={{ width: `${d.score}%` }} />
                </div>
                <p>{d.summary}</p>
              </div>
            ))}
          </div>

          {(assessment.keyStrengths.length > 0 || assessment.keyRisks.length > 0) && (
            <div className="gonogo-insights">
              {assessment.keyStrengths.length > 0 && (
                <div>
                  <strong>优势</strong>
                  <ul>
                    {assessment.keyStrengths.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}
              {assessment.keyRisks.length > 0 && (
                <div>
                  <strong>风险</strong>
                  <ul>
                    {assessment.keyRisks.map((r) => (
                      <li key={r}>{r}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
