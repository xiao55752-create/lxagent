import { LinkOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import type { IntegrationAnalytics } from '../../types'

interface Props {
  analytics: IntegrationAnalytics | null
  loading?: boolean
}

const TARGET_LABELS = { jira: 'Jira', feishu: '飞书' } as const

export default function IntegrationHistoryPanel({ analytics, loading }: Props) {
  const navigate = useNavigate()

  if (loading) {
    return <div className="integration-history loading">加载推送记录...</div>
  }

  if (!analytics) return null

  const { totals, recentPushes, webhookLogs } = analytics
  const hasData = totals.pushes > 0 || webhookLogs.length > 0
  if (!hasData) return null

  return (
    <section className="integration-history">
      <div className="integration-history-header">
        <strong>🔗 归档推送记录</strong>
        <span>Webhook 成功 {totals.webhookSuccess} · 失败 {totals.webhookFailed}</span>
      </div>

      <div className="integration-history-kpis">
        <div className="integration-kpi">
          <span className="integration-kpi-value">{totals.pushes}</span>
          <span className="integration-kpi-label">总推送</span>
        </div>
        <div className="integration-kpi">
          <span className="integration-kpi-value">{totals.jira}</span>
          <span className="integration-kpi-label">Jira</span>
        </div>
        <div className="integration-kpi">
          <span className="integration-kpi-value">{totals.feishu}</span>
          <span className="integration-kpi-label">飞书</span>
        </div>
      </div>

      {recentPushes.length > 0 && (
        <div className="integration-history-section">
          <h4>最近推送</h4>
          <ul className="integration-push-list">
            {recentPushes.map((p) => (
              <li key={`${p.projectId}-${p.target}-${p.pushedAt}`}>
                <button type="button" className="integration-push-item" onClick={() => navigate(`/initiations/${p.projectId}`)}>
                  <span className="integration-push-target">{TARGET_LABELS[p.target]}</span>
                  <span className="integration-push-title">{p.projectTitle}</span>
                  <span className="integration-push-id">{p.externalId}</span>
                  <time>{p.pushedAt.slice(0, 16).replace('T', ' ')}</time>
                </button>
                <a href={p.url} target="_blank" rel="noreferrer" className="integration-push-link">
                  <LinkOutlined />
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {webhookLogs.length > 0 && (
        <div className="integration-history-section">
          <h4>Webhook 日志</h4>
          <ul className="integration-webhook-list">
            {webhookLogs.slice(0, 8).map((log) => (
              <li key={log.id} className={log.webhookSent ? 'ok' : log.webhookError ? 'fail' : 'skip'}>
                <span className="webhook-status">{log.webhookSent ? '✓' : log.webhookError ? '✗' : '—'}</span>
                <span>{TARGET_LABELS[log.target]} · {log.projectNo}</span>
                <span className="webhook-detail">
                  {log.webhookSent ? '已触发' : log.webhookError || '未发送'}
                </span>
                <time>{log.pushedAt.slice(0, 16).replace('T', ' ')}</time>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
