import { useEffect, useState } from 'react'
import type { ApprovalRecord, ApprovalRolesConfig, InitiationProject } from '../../types'
import { CheckCircleOutlined, ClockCircleOutlined, CloseCircleOutlined } from '@ant-design/icons'
import { api } from '../../api/client'
import { resolveApproverLabel } from '../../utils/approvalRoles'

function recordForLevel(approvals: ApprovalRecord[], level: number) {
  return [...approvals].reverse().find((a) => a.level === level)
}

function levelState(
  level: number,
  project: InitiationProject,
): 'done' | 'active' | 'pending' | 'rejected' {
  const record = recordForLevel(project.approvals, level)
  if (record?.decision === 'reject') return 'rejected'
  if (record) return 'done'

  const status = project.status
  if (level === 1 && status === 'pending_l1') return 'active'
  if (level === 2 && status === 'pending_l2') return 'active'
  if (level === 3 && status === 'pending_l3') return 'active'
  if (project.approvalLevel >= level) return 'done'

  const priorDone = level === 1 || recordForLevel(project.approvals, level - 1)
  if (priorDone && ['pending_l2', 'pending_l3', 'approved', 'conditional', 'archived'].includes(status)) {
    if (level === 2 && status === 'pending_l2') return 'active'
    if (level === 3 && status === 'pending_l3') return 'active'
  }

  if (['material_ready', 'collecting'].includes(status) && level === 1) return 'pending'
  if (status === 'pending_l1' && level > 1) return 'pending'
  if (status === 'pending_l2' && level === 3) return 'pending'

  return 'pending'
}

interface Props {
  project: InitiationProject
}

export default function ApprovalTimeline({ project }: Props) {
  const [config, setConfig] = useState<ApprovalRolesConfig | null>(null)

  useEffect(() => {
    api.getApprovalRoles().then(({ config: cfg }) => setConfig(cfg)).catch(() => {})
  }, [])

  const show =
    project.currentPhase === 'approval' ||
    project.status === 'material_ready' ||
    project.approvals.length > 0 ||
    ['pending_l1', 'pending_l2', 'pending_l3', 'approved', 'conditional', 'archived', 'rejected'].includes(
      project.status,
    )

  if (!show) return null

  const levels = ([1, 2, 3] as const).map((lv) => {
    const role = config?.levels.find((r) => r.level === lv)
    const approverLabel = config
      ? resolveApproverLabel(lv, config, lv === 1 ? project.department : undefined)
      : role?.assignee ?? ''
    return {
      level: lv,
      title: role?.title ?? `L${lv} 审批`,
      role: approverLabel,
      icon: lv === 1 ? '👤' : lv === 2 ? '🏢' : '⚖️',
    }
  })

  return (
    <div className="approval-timeline">
      <div className="approval-timeline-header">
        <span>📝 三级审批流程</span>
        {project.submittedAt && (
          <time>提交于 {project.submittedAt.slice(0, 16).replace('T', ' ')}</time>
        )}
      </div>

      <div className="approval-timeline-track">
        {levels.map((lv, i) => {
          const state = levelState(lv.level, project)
          const record = recordForLevel(project.approvals, lv.level)
          const displayRole = record?.approver || lv.role

          return (
            <div key={lv.level} className={`approval-timeline-node state-${state}`}>
              {i > 0 && <div className={`approval-timeline-connector ${state === 'done' || state === 'active' ? 'filled' : ''}`} />}
              <div className="approval-timeline-dot">
                {state === 'done' && <CheckCircleOutlined />}
                {state === 'active' && <ClockCircleOutlined spin />}
                {state === 'rejected' && <CloseCircleOutlined />}
                {state === 'pending' && <span>{lv.icon}</span>}
              </div>
              <div className="approval-timeline-label">
                <strong>{lv.title}</strong>
                <span>{displayRole}</span>
                {record && (
                  <em className={record.decision === 'reject' ? 'reject' : 'pass'}>
                    {record.decision === 'approve' ? '已通过' : record.decision === 'conditional' ? '附条件通过' : '已驳回'}
                    {record.opinion ? ` · ${record.opinion}` : ''}
                  </em>
                )}
                {state === 'active' && !record && <em className="active-hint">等待 {displayRole || '审批'}...</em>}
              </div>
            </div>
          )
        })}
      </div>

      {project.status === 'archived' && project.archivedAt && (
        <div className="approval-timeline-footer">📦 已于 {project.archivedAt.slice(0, 10)} 正式归档</div>
      )}
    </div>
  )
}
