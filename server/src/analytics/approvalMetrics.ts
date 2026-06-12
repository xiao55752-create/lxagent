import type { InitiationProject } from '../types.js'

export interface ApprovalFunnelStage {
  stage: string
  label: string
  count: number
}

export interface ApprovalIssueStat {
  issue: string
  count: number
}

export interface RecentApprovalItem {
  projectId: string
  projectNo: string
  title: string
  level: number
  decision: string
  decidedAt: string
}

export interface ApprovalAnalytics {
  generatedAt: string
  totals: {
    all: number
    collecting: number
    materialReady: number
    inApproval: number
    approved: number
    archived: number
    rejected: number
  }
  avgApprovalDays: number | null
  rejectionRate: number
  passRate: number
  funnel: ApprovalFunnelStage[]
  topIssues: ApprovalIssueStat[]
  recentApprovals: RecentApprovalItem[]
}

function daysBetween(a: string, b: string): number {
  const ms = new Date(b).getTime() - new Date(a).getTime()
  return Math.max(0, ms / (1000 * 60 * 60 * 24))
}

function normalizeIssue(w: string): string {
  if (w.includes('缺少必填')) return '基本信息缺失'
  if (w.includes('材料尚未确认') || w.includes('草稿')) return '材料未确认'
  if (w.includes('300 万')) return '预算超限需重点审查'
  if (w.includes('市场分析')) return '新品缺市场分析'
  if (w.includes('竞品分析')) return '新品缺竞品分析'
  if (w.includes('validation')) return '材料校验提示'
  return w.slice(0, 40)
}

export function buildApprovalAnalytics(projects: InitiationProject[]): ApprovalAnalytics {
  const totals = {
    all: projects.length,
    collecting: projects.filter((p) => p.status === 'collecting' || p.status === 'draft').length,
    materialReady: projects.filter((p) => p.status === 'material_ready').length,
    inApproval: projects.filter((p) =>
      ['pending_l1', 'pending_l2', 'pending_l3'].includes(p.status),
    ).length,
    approved: projects.filter((p) => ['approved', 'conditional'].includes(p.status)).length,
    archived: projects.filter((p) => p.status === 'archived').length,
    rejected: projects.filter((p) => p.status === 'rejected').length,
  }

  const finished = projects.filter(
    (p) => p.submittedAt && (p.archivedAt || p.approvals.length > 0),
  )
  const approvalDurations = finished
    .map((p) => {
      const end = p.archivedAt || p.approvals[p.approvals.length - 1]?.decidedAt
      if (!end || !p.submittedAt) return null
      return daysBetween(p.submittedAt, end)
    })
    .filter((d): d is number => d !== null)

  const avgApprovalDays = approvalDurations.length
    ? Math.round((approvalDurations.reduce((a, b) => a + b, 0) / approvalDurations.length) * 10) / 10
    : null

  const decided = projects.filter((p) => p.approvals.some((a) => a.decision === 'reject') || p.status === 'rejected')
  const submitted = projects.filter((p) => p.submittedAt || p.approvals.length > 0)
  const rejectionRate = submitted.length
    ? Math.round((decided.length / submitted.length) * 100)
    : 0
  const passRate = submitted.length ? 100 - rejectionRate : 0

  const funnel: ApprovalFunnelStage[] = [
    { stage: 'collecting', label: '采集中', count: totals.collecting },
    { stage: 'material_ready', label: '材料就绪', count: totals.materialReady },
    {
      stage: 'pending',
      label: '审批中',
      count: totals.inApproval,
    },
    { stage: 'approved', label: '已通过', count: totals.approved + totals.archived },
    { stage: 'rejected', label: '已驳回', count: totals.rejected },
  ]

  const issueMap = new Map<string, number>()
  for (const p of projects) {
    for (const w of [...(p.complianceWarnings || []), ...(p.validationWarnings || [])]) {
      const key = normalizeIssue(w)
      issueMap.set(key, (issueMap.get(key) || 0) + 1)
    }
    if (p.approvalPreview && !p.approvalPreview.ready) {
      for (const item of p.approvalPreview.checklist.filter((c) => !c.ok)) {
        const key = normalizeIssue(item.label)
        issueMap.set(key, (issueMap.get(key) || 0) + 1)
      }
    }
  }

  const topIssues = [...issueMap.entries()]
    .map(([issue, count]) => ({ issue, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6)

  const recentApprovals: RecentApprovalItem[] = []
  for (const p of projects) {
    for (const a of p.approvals) {
      recentApprovals.push({
        projectId: p.id,
        projectNo: p.projectNo,
        title: p.title,
        level: a.level,
        decision: a.decision,
        decidedAt: a.decidedAt,
      })
    }
  }
  recentApprovals.sort((a, b) => b.decidedAt.localeCompare(a.decidedAt))

  return {
    generatedAt: new Date().toISOString(),
    totals,
    avgApprovalDays,
    rejectionRate,
    passRate,
    funnel,
    topIssues,
    recentApprovals: recentApprovals.slice(0, 8),
  }
}
