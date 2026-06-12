import { Button } from 'antd'
import { CheckCircleOutlined, CloseCircleOutlined, SafetyCertificateOutlined, WarningOutlined } from '@ant-design/icons'
import type { ApprovalPreview, ComplianceCellStatus, PreReviewRecommendation } from '../../types'

interface Props {
  project: { approvalPreview?: ApprovalPreview | null }
  loading?: boolean
  onRecheck: () => void
  onConfirm: () => void
  onCancel: () => void
}

const STATUS_LABELS: Record<ComplianceCellStatus, string> = {
  pass: '满足',
  fail: '缺失',
  warn: '待确认',
  pending: '待定',
  na: '不适用',
}

const REC_TONE: Record<PreReviewRecommendation, string> = {
  approve: 'rec-approve',
  conditional: 'rec-conditional',
  reject: 'rec-reject',
  supplement: 'rec-supplement',
}

export default function ApprovalGatePanel({ project, loading, onRecheck, onConfirm, onCancel }: Props) {
  const preview = project.approvalPreview

  return (
    <div className="approval-gate-panel">
      <div className="approval-gate-header">
        <SafetyCertificateOutlined />
        <div>
          <strong>提交前合规预检</strong>
          <span>合规矩阵 + AI 预审报告 · 两阶段确认</span>
        </div>
      </div>

      {!preview ? (
        <p className="approval-gate-hint">
          点击下方「开始预检」，系统将生成合规矩阵与 AI 预审建议，全部通过后方可提交审批。
        </p>
      ) : (
        <>
          <div className={`pre-review-report ${REC_TONE[preview.report.recommendation]}`}>
            <div className="pre-review-report-head">
              <div>
                <span className="pre-review-badge">AI 预审</span>
                <strong>{preview.report.recommendationLabel}</strong>
              </div>
              <div className="pre-review-stats">
                <span>通过率预测 {preview.report.predictedPassRate}%</span>
                <span>置信度 {preview.report.confidence}%</span>
                <span>{preview.report.generatedBy === 'llm' ? 'LLM 增强' : '规则引擎'}</span>
              </div>
            </div>
            <p className="pre-review-summary">{preview.report.summary}</p>

            {preview.report.conflicts.length > 0 && (
              <div className="pre-review-block">
                <strong>逻辑冲突</strong>
                <ul>
                  {preview.report.conflicts.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
              </div>
            )}

            {preview.report.risks.length > 0 && (
              <div className="pre-review-block">
                <strong>风险提示</strong>
                <ul>
                  {preview.report.risks.slice(0, 4).map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              </div>
            )}

            {preview.report.suggestedActions.length > 0 && (
              <div className="pre-review-block">
                <strong>建议动作</strong>
                <ul>
                  {preview.report.suggestedActions.map((a) => (
                    <li key={a}>{a}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="compliance-matrix-wrap">
            <div className="compliance-matrix-title">合规矩阵</div>
            <table className="compliance-matrix">
              <thead>
                <tr>
                  <th>类别</th>
                  <th>要求</th>
                  <th>状态</th>
                  <th>依据 / 证据</th>
                </tr>
              </thead>
              <tbody>
                {preview.matrix.map((row) => (
                  <tr key={row.id} className={`matrix-row status-${row.status}`}>
                    <td>{row.category}</td>
                    <td>
                      {row.requirement}
                      {row.blocking && row.status === 'fail' && (
                        <WarningOutlined className="matrix-block-icon" title="阻断项" />
                      )}
                    </td>
                    <td>
                      <span className={`matrix-status-pill status-${row.status}`}>
                        {STATUS_LABELS[row.status]}
                      </span>
                    </td>
                    <td className="matrix-evidence">
                      <em>{row.source}</em>
                      {row.evidence && <span>{row.evidence}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="approval-checklist">
            {preview.checklist.map((item) => (
              <li key={item.id} className={item.ok ? 'ok' : 'fail'}>
                {item.ok ? (
                  <CheckCircleOutlined className="check-icon ok" />
                ) : (
                  <CloseCircleOutlined className="check-icon fail" />
                )}
                <div>
                  <span>{item.label}</span>
                  {!item.ok && item.hint && <em>{item.hint}</em>}
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      {preview && (
        <div className={`approval-gate-result ${preview.ready ? 'ready' : 'blocked'}`}>
          {preview.ready ? '预检通过，可以提交三级审批' : '请先完成合规矩阵中的阻断项'}
        </div>
      )}

      <div className="approval-gate-actions">
        <Button onClick={onCancel}>取消</Button>
        <Button onClick={onRecheck} loading={loading}>
          {preview ? '重新预检' : '开始预检'}
        </Button>
        <Button
          type="primary"
          className="btn-glow"
          disabled={!preview?.ready}
          loading={loading}
          onClick={onConfirm}
        >
          确认提交审批
        </Button>
      </div>
    </div>
  )
}
