import { PlusOutlined, RocketOutlined, BellOutlined } from '@ant-design/icons'
import { Button, Empty, message } from 'antd'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { STATUS_LABELS, type InitiationProject } from '../types'
import { PhaseArt } from '../components/visual/VisualAssets'
import ApprovalDashboard from '../components/analytics/ApprovalDashboard'
import IntegrationHistoryPanel from '../components/analytics/IntegrationHistoryPanel'
import ApprovalRolesSettings from '../components/agent/ApprovalRolesSettings'
import IntegrationSettings from '../components/agent/IntegrationSettings'
import PageShell from '../components/layout/PageShell'
import PageHero from '../components/layout/PageHero'
import LoadingState from '../components/layout/LoadingState'
import { useEffect, useState } from 'react'
import type { ApprovalAnalytics, IntegrationAnalytics } from '../types'

function progressPercent(p: InitiationProject) {
  const phases = Object.values(p.phaseStatuses || {})
  if (!phases.length) return 0
  return Math.round((phases.filter((s) => s === 'completed').length / phases.length) * 100)
}

function statusGradient(status: InitiationProject['status']) {
  const map: Record<string, string> = {
    draft: 'linear-gradient(135deg, #94a3b8, #64748b)',
    collecting: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    material_ready: 'linear-gradient(135deg, #06b6d4, #0ea5e9)',
    pending_l1: 'linear-gradient(135deg, #f59e0b, #f97316)',
    pending_l2: 'linear-gradient(135deg, #f59e0b, #ea580c)',
    pending_l3: 'linear-gradient(135deg, #f97316, #ef4444)',
    approved: 'linear-gradient(135deg, #22c55e, #10b981)',
    conditional: 'linear-gradient(135deg, #eab308, #ca8a04)',
    rejected: 'linear-gradient(135deg, #ef4444, #dc2626)',
    archived: 'linear-gradient(135deg, #14b8a6, #0d9488)',
  }
  return map[status] || map.collecting
}

function inboxHint(item: InitiationProject): { icon: string; text: string; urgent?: boolean } | null {
  if (item.status === 'material_ready') return { icon: '📝', text: '材料就绪，待提交审批', urgent: true }
  if (item.status === 'rejected') return { icon: '↩️', text: '审批驳回，需补充修改', urgent: true }
  if (['pending_l1', 'pending_l2', 'pending_l3'].includes(item.status))
    return { icon: '⏳', text: STATUS_LABELS[item.status] }
  if (item.status === 'collecting' && progressPercent(item) < 30)
    return { icon: '💬', text: '继续对话，补充项目信息' }
  return null
}

function InitiationCard({ item, onClick }: { item: InitiationProject; onClick: () => void }) {
  const pct = progressPercent(item)
  const matCount = item.materials?.length || 0
  const hint = inboxHint(item)

  return (
    <article className="init-card" onClick={onClick}>
      {hint && (
        <div className={`init-card-inbox ${hint.urgent ? 'urgent' : ''}`}>
          {hint.icon} {hint.text}
        </div>
      )}
      <div className="init-card-banner" style={{ background: statusGradient(item.status) }}>
        <PhaseArt phaseId={item.currentPhase} size={48} />
        <div className="init-card-banner-text">
          <span className="init-card-no">{item.projectNo}</span>
          <span className="init-card-status">{STATUS_LABELS[item.status]}</span>
        </div>
      </div>
      <div className="init-card-body">
        <h3>{item.title}</h3>
        <p>{item.department || '—'} · {item.proposer || '待补充'}</p>
        <div className="init-card-stats">
          <div className="init-card-stat">
            <span className="init-card-stat-num">{matCount}</span>
            <span className="init-card-stat-label">材料</span>
          </div>
          <div className="init-card-stat">
            <span className="init-card-stat-num">{pct}%</span>
            <span className="init-card-stat-label">进度</span>
          </div>
        </div>
        <div className="init-card-progress">
          <div className="init-card-progress-fill" style={{ width: `${pct}%` }} />
        </div>
        <div className="init-card-footer">更新于 {item.updatedAt?.slice(0, 10)}</div>
      </div>
    </article>
  )
}

export default function InitiationListPage() {
  const [items, setItems] = useState<InitiationProject[]>([])
  const [analytics, setAnalytics] = useState<ApprovalAnalytics | null>(null)
  const [integrationAnalytics, setIntegrationAnalytics] = useState<IntegrationAnalytics | null>(null)
  const [analyticsLoading, setAnalyticsLoading] = useState(false)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const load = async () => {
    setLoading(true)
    setAnalyticsLoading(true)
    try {
      const [listRes, analyticsRes, integrationRes] = await Promise.all([
        api.listInitiations(),
        api.getApprovalAnalytics().catch(() => null),
        api.getIntegrationAnalytics().catch(() => null),
      ])
      setItems(listRes.items)
      if (analyticsRes) setAnalytics(analyticsRes.analytics)
      if (integrationRes) setIntegrationAnalytics(integrationRes.analytics)
    } catch {
      message.error('无法加载立项列表，请确认后端已启动')
    } finally {
      setLoading(false)
      setAnalyticsLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const handleCreate = async () => {
    try {
      const { project } = await api.createInitiation()
      navigate(`/initiations/${project.id}`)
    } catch {
      message.error('创建立项失败')
    }
  }

  const actionItems = items.filter((i) => inboxHint(i)?.urgent)

  return (
    <PageShell wide className="list-page">
      <PageHero
        badge="🚀 智能立项"
        title="我的立项项目"
        description="与 AI 助手对话，智能体自动采集、生成材料并完成审批归档"
        actions={
          <>
            <Button type="primary" size="large" icon={<PlusOutlined />} onClick={handleCreate} className="btn-glow">
              新建立项
            </Button>
            <ApprovalRolesSettings />
            <IntegrationSettings />
          </>
        }
      />

      <ApprovalDashboard analytics={analytics} loading={analyticsLoading} />

      <IntegrationHistoryPanel analytics={integrationAnalytics} loading={analyticsLoading} />

      {actionItems.length > 0 && (
        <div className="agent-inbox-banner">
          <div className="agent-inbox-title">
            <BellOutlined /> 待你处理 ({actionItems.length})
          </div>
          <div className="agent-inbox-chips">
            {actionItems.map((item) => (
              <button
                key={item.id}
                type="button"
                className="agent-inbox-chip"
                onClick={() => navigate(`/initiations/${item.id}`)}
              >
                {item.title} · {inboxHint(item)?.text}
              </button>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <LoadingState tip="加载立项列表..." minHeight="40vh" />
      ) : items.length === 0 ? (
        <div className="list-empty">
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="还没有立项项目，从第一个对话开始">
            <Button type="primary" size="large" icon={<RocketOutlined />} onClick={handleCreate} className="btn-glow">
              开始第一个立项
            </Button>
          </Empty>
        </div>
      ) : (
        <>
          <div className="section-label">全部项目 · {items.length}</div>
          <div className="init-card-grid">
            {items.map((item) => (
              <InitiationCard key={item.id} item={item} onClick={() => navigate(`/initiations/${item.id}`)} />
            ))}
          </div>
        </>
      )}
    </PageShell>
  )
}
