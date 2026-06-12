import type { ApprovalAnalytics } from '../../types'

interface Props {
  analytics: ApprovalAnalytics | null
  loading?: boolean
}

export default function ApprovalDashboard({ analytics, loading }: Props) {
  if (loading) {
    return <div className="approval-dashboard loading">加载审批效能数据...</div>
  }
  if (!analytics) return null

  const maxFunnel = Math.max(...analytics.funnel.map((f) => f.count), 1)

  return (
    <section className="approval-dashboard">
      <div className="approval-dashboard-header">
        <div>
          <strong>审批效能看板</strong>
          <span>PMO 视角 · 更新于 {analytics.generatedAt.slice(0, 16).replace('T', ' ')}</span>
        </div>
      </div>

      <div className="approval-dashboard-kpis">
        <div className="approval-kpi">
          <span className="approval-kpi-value">{analytics.totals.all}</span>
          <span className="approval-kpi-label">立项总数</span>
        </div>
        <div className="approval-kpi">
          <span className="approval-kpi-value">{analytics.totals.inApproval}</span>
          <span className="approval-kpi-label">审批中</span>
        </div>
        <div className="approval-kpi">
          <span className="approval-kpi-value">
            {analytics.avgApprovalDays !== null ? `${analytics.avgApprovalDays}天` : '—'}
          </span>
          <span className="approval-kpi-label">平均审批周期</span>
        </div>
        <div className="approval-kpi">
          <span className="approval-kpi-value">{analytics.passRate}%</span>
          <span className="approval-kpi-label">通过率</span>
        </div>
        <div className="approval-kpi warn">
          <span className="approval-kpi-value">{analytics.rejectionRate}%</span>
          <span className="approval-kpi-label">驳回率</span>
        </div>
      </div>

      <div className="approval-dashboard-grid">
        <div className="approval-dashboard-panel">
          <h4>审批漏斗</h4>
          <ul className="approval-funnel">
            {analytics.funnel.map((stage) => (
              <li key={stage.stage}>
                <span className="approval-funnel-label">{stage.label}</span>
                <div className="approval-funnel-bar-wrap">
                  <div
                    className="approval-funnel-bar"
                    style={{ width: `${Math.max(8, (stage.count / maxFunnel) * 100)}%` }}
                  />
                </div>
                <span className="approval-funnel-count">{stage.count}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="approval-dashboard-panel">
          <h4>常见缺失项 Top</h4>
          {analytics.topIssues.length ? (
            <ul className="approval-issues">
              {analytics.topIssues.map((item) => (
                <li key={item.issue}>
                  <span>{item.issue}</span>
                  <em>{item.count}</em>
                </li>
              ))}
            </ul>
          ) : (
            <p className="approval-dashboard-empty">暂无合规问题统计</p>
          )}
        </div>

        <div className="approval-dashboard-panel wide">
          <h4>最近审批动态</h4>
          {analytics.recentApprovals.length ? (
            <ul className="approval-recent">
              {analytics.recentApprovals.map((item) => (
                <li key={`${item.projectId}-${item.level}-${item.decidedAt}`}>
                  <strong>{item.projectNo}</strong>
                  <span>{item.title}</span>
                  <em className={item.decision === 'reject' ? 'reject' : 'pass'}>
                    L{item.level} {item.decision === 'approve' ? '通过' : item.decision === 'reject' ? '驳回' : item.decision}
                  </em>
                  <time>{item.decidedAt.slice(0, 10)}</time>
                </li>
              ))}
            </ul>
          ) : (
            <p className="approval-dashboard-empty">暂无审批记录</p>
          )}
        </div>
      </div>
    </section>
  )
}
