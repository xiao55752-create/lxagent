import { CheckCircleOutlined, LoadingOutlined, LockOutlined } from '@ant-design/icons'
import { Tag } from 'antd'
import { PHASES } from '../data/phases'
import { STATUS_LABELS, type InitiationStatus, type PhaseId } from '../types'
import { useInitiationStore } from '../store/useInitiationStore'
import { PhaseArt } from './visual/VisualAssets'
import AgentActivityStream from './agent/AgentActivityStream'
import EvidencePanel from './agent/EvidencePanel'

const CAPABILITY_MODULES = PHASES.filter((p) => p.id !== 'complete')

function moduleStatusLabel(
  status: string,
  isFocused: boolean,
  agentTask: string | null | undefined,
  phaseId: PhaseId,
): string {
  if (status === 'completed') return '已完成'
  if (phaseId === 'approval') return status === 'active' ? '可提交' : '待材料就绪'
  if (isFocused && agentTask) return agentTask
  if (status === 'active') return isFocused ? '对话中' : '可补充'
  return '未开始'
}

export default function PhaseSidebar() {
  const project = useInitiationStore((s) => s.project)
  const setFocusModule = useInitiationStore((s) => s.setFocusModule)
  const requestKbDoc = useInitiationStore((s) => s.requestKbDoc)
  if (!project) return null

  const workModules = CAPABILITY_MODULES.filter((p) => p.id !== 'approval')
  const completedCount = workModules.filter((p) => project.phaseStatuses[p.id] === 'completed').length
  const progress = Math.round((completedCount / workModules.length) * 100)
  const confirmedMaterials = project.materials.filter((m) => m.status !== 'draft').length
  const focusPhase = project.focusPhase

  return (
    <div className="phase-sidebar visual-sidebar">
      <div className="phase-sidebar-header visual-sidebar-header">
        <div className="project-cover">
          <PhaseArt phaseId={focusPhase || 'setup'} size={52} />
          <div>
            <h2>{project.title}</h2>
            <div className="project-id">{project.projectNo}</div>
          </div>
        </div>
        <Tag color="blue">{STATUS_LABELS[project.status as InitiationStatus]}</Tag>
        <div className="progress-ring-wrap">
          <svg className="progress-ring" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="34" fill="none" stroke="#eef2ff" strokeWidth="6" />
            <circle
              cx="40"
              cy="40"
              r="34"
              fill="none"
              stroke="url(#progressGrad)"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={`${progress * 2.14} 214`}
              transform="rotate(-90 40 40)"
            />
            <defs>
              <linearGradient id="progressGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#6366f1" />
                <stop offset="100%" stopColor="#06b6d4" />
              </linearGradient>
            </defs>
            <text x="40" y="44" textAnchor="middle" className="progress-ring-text">
              {progress}%
            </text>
          </svg>
          <div className="progress-ring-meta">
            <span>{confirmedMaterials} 份材料已归档</span>
            <span>{completedCount}/{workModules.length} 能力就绪</span>
          </div>
        </div>
      </div>

      <div className="capability-modules">
        <div className="capability-modules-header">
          <span>立项能力模块</span>
          <button
            type="button"
            className={`capability-focus-clear ${!focusPhase ? 'active' : ''}`}
            onClick={() => setFocusModule(null)}
          >
            自由对话
          </button>
        </div>

        <div className="capability-modules-grid">
          {CAPABILITY_MODULES.map((phase) => {
            const status = project.phaseStatuses[phase.id]
            const isFocused = focusPhase === phase.id
            const subtitle = moduleStatusLabel(status, isFocused, project.agentTask, phase.id)
            const isExecuting = isFocused && !!project.agentTask

            return (
              <button
                key={phase.id}
                type="button"
                className={`capability-module-card state-${status} ${isFocused ? 'focused' : ''}`}
                onClick={() => setFocusModule(isFocused ? null : phase.id)}
              >
                <div className="capability-module-icon">
                  <PhaseArt phaseId={phase.id} size={32} />
                  {status === 'completed' && (
                    <span className="capability-module-check">
                      <CheckCircleOutlined />
                    </span>
                  )}
                  {isExecuting && (
                    <span className="capability-module-spin">
                      <LoadingOutlined spin />
                    </span>
                  )}
                </div>
                <div className="capability-module-body">
                  <div className="capability-module-title">{phase.title}</div>
                  <div className="capability-module-sub">{phase.subtitle}</div>
                  <div className={`capability-module-status ${isExecuting ? 'executing' : ''}`}>
                    {subtitle}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      <AgentActivityStream messages={project.messages} agentTask={project.agentTask} />

      <EvidencePanel ruleRefDocIds={project.ruleRefs} onOpenDoc={requestKbDoc} />

      <div className="phase-sidebar-footer">
        <div className="meta-chip">👤 {project.proposer || '—'}</div>
        <div className="meta-chip">🏢 {project.department || '—'}</div>
        <div className="meta-chip">🏷 {project.projectType || '—'}</div>
        {project.archivedAt && (
          <div className="meta-chip archived">
            <LockOutlined /> {project.archivedAt.slice(0, 10)} 归档
          </div>
        )}
      </div>
    </div>
  )
}
