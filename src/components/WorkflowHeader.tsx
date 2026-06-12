import { ArrowLeftOutlined } from '@ant-design/icons'
import { Button, Tag } from 'antd'
import { STATUS_COLORS, STATUS_LABELS } from '../types'
import { useInitiationStore } from '../store/useInitiationStore'
import { PHASES } from '../data/phases'
import ActorRoleSelector from './agent/ActorRoleSelector'

export default function WorkflowHeader({ onBack }: { onBack: () => void }) {
  const project = useInitiationStore((s) => s.project)

  if (!project) return null

  const completed = PHASES.filter((p) => project.phaseStatuses[p.id] === 'completed').length
  const pct = Math.round((completed / PHASES.length) * 100)

  return (
    <div className="workflow-header visual-workflow-header">
      <Button type="text" icon={<ArrowLeftOutlined />} onClick={onBack} className="back-btn">
        返回
      </Button>
      <div className="workflow-header-info">
        <span className="workflow-header-title">{project.title}</span>
        <span className="workflow-header-no">{project.projectNo}</span>
        <Tag color={STATUS_COLORS[project.status]}>{STATUS_LABELS[project.status]}</Tag>
      </div>
      <ActorRoleSelector />
      <div className="workflow-header-progress">
        <div className="workflow-progress-bar">
          <div className="workflow-progress-fill" style={{ width: `${pct}%` }} />
        </div>
        <span>{pct}%</span>
      </div>
    </div>
  )
}
