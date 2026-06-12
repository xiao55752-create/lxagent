import { Button } from 'antd'
import { PlayCircleOutlined, CloseOutlined, StepForwardOutlined, StopOutlined } from '@ant-design/icons'
import type { AgentPlan, PhaseId } from '../../types'
import { PhaseArt } from '../visual/VisualAssets'

interface Props {
  plan: AgentPlan
  currentPhase: PhaseId
  executing?: boolean
  onExecuteAll: () => void
  onExecuteStep: (stepId: string) => void
  onSkipStep: (stepId: string) => void
  onDismiss: () => void
}

export default function AgentPlanPanel({
  plan,
  currentPhase,
  executing,
  onExecuteAll,
  onExecuteStep,
  onSkipStep,
  onDismiss,
}: Props) {
  const pendingCount = plan.steps.filter((s) => s.status === 'pending').length
  const doneCount = plan.steps.filter((s) => s.status === 'done').length

  return (
    <div className="agent-plan-panel">
      <div className="agent-plan-header">
        <div>
          <strong>📋 智能体执行计划</strong>
          <span className="agent-plan-sub">
            {doneCount}/{plan.steps.length} 已完成 · 可逐步执行或一键全部执行
          </span>
        </div>
        <button type="button" className="agent-plan-dismiss" onClick={onDismiss} aria-label="关闭">
          <CloseOutlined />
        </button>
      </div>

      <ol className="agent-plan-steps">
        {plan.steps.map((step, i) => {
          const isCurrent = step.phaseId === currentPhase && step.status === 'pending'
          return (
            <li key={step.id} className={`agent-plan-step status-${step.status} ${isCurrent ? 'is-current' : ''}`}>
              <span className="agent-plan-step-num">{i + 1}</span>
              <PhaseArt phaseId={step.phaseId as PhaseId} size={28} />
              <div className="agent-plan-step-text">
                <span>{step.title}</span>
                {step.status === 'running' && <em>执行中...</em>}
                {step.status === 'done' && <em>✓ 完成</em>}
                {step.status === 'skipped' && <em>已跳过</em>}
                {isCurrent && <em className="current-tag">当前可执行</em>}
              </div>
              {step.status === 'pending' && isCurrent && (
                <div className="agent-plan-step-actions">
                  <Button
                    type="primary"
                    size="small"
                    icon={<StepForwardOutlined />}
                    loading={executing}
                    onClick={() => onExecuteStep(step.id)}
                  >
                    执行
                  </Button>
                  <Button size="small" icon={<StopOutlined />} onClick={() => onSkipStep(step.id)}>
                    跳过
                  </Button>
                </div>
              )}
            </li>
          )
        })}
      </ol>

      <Button
        type="primary"
        block
        size="large"
        icon={<PlayCircleOutlined />}
        loading={executing}
        onClick={onExecuteAll}
        className="btn-glow"
        disabled={pendingCount === 0}
      >
        一键执行剩余 {pendingCount} 步
      </Button>
    </div>
  )
}
