import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Button, Input, Tag, Alert, message } from 'antd'
import { LoadingOutlined, SendOutlined } from '@ant-design/icons'
import { useInitiationStore } from '../store/useInitiationStore'
import { AgentAvatar, PhaseArt } from './visual/VisualAssets'
import AgentActionReceipts from './agent/AgentActionReceipts'
import AutonomyControl from './agent/AutonomyControl'
import AgentPlanPanel from './agent/AgentPlanPanel'
import ApprovalGatePanel from './agent/ApprovalGatePanel'
import ApprovalTimeline from './agent/ApprovalTimeline'
import ApprovalActionModal from './agent/ApprovalActionModal'
import ArchivePushPanel from './agent/ArchivePushPanel'
import AgentUndoBar from './agent/AgentUndoBar'
import GoNoGoPanel from './agent/GoNoGoPanel'
import SimilarCasesPanel from './agent/SimilarCasesPanel'
import RuleCitationChips from './agent/RuleCitationChips'
import ContextRulesPanel from './workspace/ContextRulesPanel'
import KbDocumentDrawer from './knowledge/KbDocumentDrawer'
import { api, type KbDocument } from '../api/client'
import type { ApprovalRoleLevel, ApprovalRolesConfig, AutonomyLevel } from '../types'
import { resolveDepartmentAssignee } from '../utils/approvalRoles'
import {
  ACTOR_ROLE_LABELS,
  canActOnApprovalLevel,
  pendingApprovalLevel,
} from '../utils/actorRole'

const PHASE_LABELS: Record<string, string> = {
  setup: '项目建档',
  background: '背景与机会',
  market: '市场分析',
  competitive: '竞品分析',
  product: '产品方案',
  technical: '技术路线',
  feasibility: '可行性分析',
  budget: '资源预算',
  approval: '三级审批',
  complete: '立项完成',
}

const PROMPT_CHIPS = [
  { icon: '💡', text: '描述项目想法与背景' },
  { icon: '📊', text: '补充市场与竞品信息' },
  { icon: '💰', text: '说明预算与团队配置' },
  { icon: '❓', text: '询问立项规则与标准' },
]

const READONLY_STATUS = ['pending_l1', 'pending_l2', 'pending_l3', 'approved', 'conditional', 'archived']

export default function ChatPanel() {
  const {
    project,
    isGenerating,
    error,
    sendMessage,
    submitApproval,
    processApproval,
    setActiveMaterial,
    setAutonomy,
    setProject,
    executePlan,
    dismissPlan,
    executePlanStep,
    skipPlanStep,
    prepareApproval,
    rollback,
    assessGoNoGo,
    highlightMessageId,
    setHighlightMessageId,
    similarCases,
    loadSimilarCases,
    kbDocRequest,
    clearKbDocRequest,
    actorRole,
  } = useInitiationStore()

  const [input, setInput] = useState('')
  const [showApprovalGate, setShowApprovalGate] = useState(false)
  const [approvalModalOpen, setApprovalModalOpen] = useState(false)
  const [approvalConfig, setApprovalConfig] = useState<ApprovalRolesConfig | null>(null)
  const [kbDrawerOpen, setKbDrawerOpen] = useState(false)
  const [kbDrawerDoc, setKbDrawerDoc] = useState<KbDocument | null>(null)
  const [kbDrawerLoading, setKbDrawerLoading] = useState(false)
  const [kbHighlightExcerpt, setKbHighlightExcerpt] = useState<string | undefined>()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    api.getApprovalRoles().then(({ config }) => setApprovalConfig(config)).catch(() => {})
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [project?.messages, isGenerating])

  useEffect(() => {
    if (!highlightMessageId) return
    const el = document.querySelector(`[data-message-id="${highlightMessageId}"]`)
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    const t = window.setTimeout(() => setHighlightMessageId(null), 2500)
    return () => window.clearTimeout(t)
  }, [highlightMessageId, setHighlightMessageId])

  useEffect(() => {
    const quote = (location.state as { quote?: string } | null)?.quote
    if (!quote) return
    setInput(quote)
    message.success('规则已引用到对话输入框')
    navigate(location.pathname, { replace: true, state: {} })
  }, [location.state, location.pathname, navigate])

  useEffect(() => {
    if (!kbDocRequest) return
    const { docId, excerpt } = kbDocRequest
    const open = async () => {
      setKbHighlightExcerpt(excerpt)
      setKbDrawerOpen(true)
      setKbDrawerLoading(true)
      setKbDrawerDoc(null)
      try {
        const { document } = await api.getKbDocument(docId)
        setKbDrawerDoc(document)
      } catch {
        message.error('无法加载规则文档')
        setKbDrawerOpen(false)
      } finally {
        setKbDrawerLoading(false)
        clearKbDocRequest()
      }
    }
    open()
  }, [kbDocRequest, clearKbDocRequest])

  if (!project) return null

  const readonly = READONLY_STATUS.includes(project.status)
  const canChat = project.status !== 'archived'

  const handleQuoteToChat = (text: string) => {
    setInput(text)
    message.success('已填入对话输入框，可编辑后发送')
  }

  const handleOpenRuleDoc = async (docId: string, excerpt?: string) => {
    setKbHighlightExcerpt(excerpt)
    setKbDrawerOpen(true)
    setKbDrawerLoading(true)
    setKbDrawerDoc(null)
    try {
      const { document } = await api.getKbDocument(docId)
      setKbDrawerDoc(document)
    } catch {
      message.error('无法加载规则文档')
      setKbDrawerOpen(false)
    } finally {
      setKbDrawerLoading(false)
    }
  }

  const handleSend = async (text?: string) => {
    const val = (text ?? input).trim()
    if (!val || isGenerating) return
    setInput('')
    await sendMessage(val)
  }

  const showSubmit =
    project.status === 'material_ready' || (project.currentPhase === 'approval' && project.approvalLevel === 0)

  const pendingLevelForGate = pendingApprovalLevel(project.status)
  const canApproveNow =
    pendingLevelForGate !== null && canActOnApprovalLevel(actorRole, pendingLevelForGate)

  const showApproval =
    project.currentPhase === 'approval' &&
    project.approvalLevel < 3 &&
    ['pending_l1', 'pending_l2', 'pending_l3'].includes(project.status) &&
    canApproveNow

  const showApprovalWaiting =
    project.currentPhase === 'approval' &&
    ['pending_l1', 'pending_l2', 'pending_l3'].includes(project.status) &&
    !canApproveNow

  const approvalLevel = project.approvalLevel
  const showWelcome = project.messages.length <= 2
  const autonomy = (project.autonomyLevel || 'execute') as AutonomyLevel
  const focusPhase = project.focusPhase
  const headerPhase = focusPhase || 'setup'
  const headerLabel = focusPhase
    ? `关注：${PHASE_LABELS[focusPhase]}`
    : '自由对话 · 所有模块'
  const lastSnapshot = project.agentSnapshots?.length
    ? project.agentSnapshots[project.agentSnapshots.length - 1]
    : null

  const pendingLevel = (approvalLevel + 1) as 1 | 2 | 3
  const pendingRole: ApprovalRoleLevel | undefined = (() => {
    const base = approvalConfig?.levels.find((r) => r.level === pendingLevel)
    if (!base) return undefined
    if (pendingLevel === 1 && approvalConfig) {
      const mapped = resolveDepartmentAssignee(project.department, approvalConfig)
      return mapped ? { ...base, assignee: mapped } : base
    }
    return base
  })()

  return (
    <div className="chat-area visual-chat">
      <div className="chat-header visual-chat-header">
        <div className="chat-header-left">
          <AgentAvatar size={40} />
          <div>
            <h2>立项智能助手</h2>
            <div className="chat-header-sub">
              <PhaseArt phaseId={headerPhase} size={22} />
              <span>{headerLabel}</span>
              {project.agentTask && (
                <Tag color="processing" icon={<LoadingOutlined spin />} className="agent-task-tag">
                  {project.agentTask}
                </Tag>
              )}
            </div>
          </div>
        </div>
        {!readonly && canChat && (
          <AutonomyControl
            value={autonomy}
            disabled={isGenerating}
            onChange={(level) => setAutonomy(level)}
          />
        )}
      </div>

      {error && <Alert type="error" message={error} showIcon style={{ margin: '8px 24px 0' }} closable />}

      {isGenerating && (
        <div className="generating-overlay visual-generating">
          <LoadingOutlined spin />
          智能体正在分析并生成材料...
        </div>
      )}

      {(project.complianceWarnings.length > 0 || project.validationWarnings.length > 0) && (
        <div className="validation-banner">
          {[...project.complianceWarnings, ...project.validationWarnings].map((w) => (
            <div key={w}>⚠️ {w}</div>
          ))}
        </div>
      )}

      <ApprovalTimeline project={project} />

      <ContextRulesPanel
        projectId={project.id}
        focusPhase={project.focusPhase}
        currentPhase={project.currentPhase}
        onOpenDoc={handleOpenRuleDoc}
        onQuoteToChat={handleQuoteToChat}
      />

      <KbDocumentDrawer
        document={kbDrawerDoc}
        loading={kbDrawerLoading}
        open={kbDrawerOpen}
        onClose={() => {
          setKbDrawerOpen(false)
          setKbHighlightExcerpt(undefined)
        }}
        highlightExcerpt={kbHighlightExcerpt}
        onQuoteToChat={canChat ? handleQuoteToChat : undefined}
      />

      <ArchivePushPanel project={project} onUpdate={setProject} />

      <GoNoGoPanel
        assessment={project.goNoGoAssessment}
        loading={isGenerating}
        onRefresh={() => assessGoNoGo()}
      />

      <SimilarCasesPanel
        cases={similarCases}
        loading={isGenerating}
        onRefresh={() => loadSimilarCases()}
        onApplyCase={(hint) => handleSend(hint)}
      />

      {!readonly && lastSnapshot && (
        <AgentUndoBar
          label={lastSnapshot.label}
          loading={isGenerating}
          onRollback={() => rollback()}
        />
      )}

      <div className="chat-messages">
        {showWelcome && (
          <div className="chat-welcome-card">
            <div className="chat-welcome-icon">✨</div>
            <h3>一个对话窗口，完成所有立项能力</h3>
            <p>
              左侧每个模块相互独立，不必按顺序来。你可以一次说完项目信息，也可以点击某个模块聚焦后补充。
              右上角可切换自主度：建议 / 草稿 / 自动。
            </p>
          </div>
        )}

        {project.agentPlan && project.agentPlan.steps.length > 0 && (
          <AgentPlanPanel
            plan={project.agentPlan}
            currentPhase={project.focusPhase || project.currentPhase}
            executing={isGenerating}
            onExecuteAll={() => executePlan()}
            onExecuteStep={(stepId) => executePlanStep(stepId)}
            onSkipStep={(stepId) => skipPlanStep(stepId)}
            onDismiss={() => dismissPlan()}
          />
        )}

        {showApprovalGate && (
          <ApprovalGatePanel
            project={project}
            loading={isGenerating}
            onRecheck={() => prepareApproval()}
            onConfirm={async () => {
              await submitApproval()
              setShowApprovalGate(false)
            }}
            onCancel={() => setShowApprovalGate(false)}
          />
        )}

        {project.messages.map((msg) => (
          <div
            key={msg.id}
            data-message-id={msg.id}
            className={`message ${msg.role} ${highlightMessageId === msg.id ? 'message-highlight' : ''}`}
          >
            {msg.role === 'agent' && (
              <div className="message-avatar">
                <AgentAvatar size={36} />
              </div>
            )}
            {msg.role === 'user' && <div className="message-avatar user-avatar">你</div>}
            <div className="message-content-wrap">
              <div className="message-bubble">{msg.content}</div>
              {msg.role === 'agent' && msg.actions && msg.actions.length > 0 && (
                <>
                  <RuleCitationChips actions={msg.actions} onOpenDoc={handleOpenRuleDoc} />
                  <AgentActionReceipts
                    actions={msg.actions}
                    onMaterialClick={(type) => setActiveMaterial(type)}
                  />
                </>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-area visual-chat-input">
        {canChat && !readonly && !isGenerating && (
          <div className="prompt-chips">
            {PROMPT_CHIPS.map((c) => (
              <button key={c.text} type="button" className="prompt-chip" onClick={() => setInput(c.text)}>
                <span>{c.icon}</span> {c.text}
              </button>
            ))}
          </div>
        )}

        {canChat && !isGenerating && (
          <div className="chat-input-row">
            <Input.TextArea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                readonly
                  ? '审批流程中，可询问规则与标准...'
                  : '描述项目想法、背景、市场、预算等...'
              }
              autoSize={{ minRows: 1, maxRows: 4 }}
              onPressEnter={(e) => {
                if (!e.shiftKey) {
                  e.preventDefault()
                  handleSend()
                }
              }}
              size="large"
              className="chat-textarea"
            />
            <Button
              type="primary"
              icon={<SendOutlined />}
              size="large"
              onClick={() => handleSend()}
              disabled={!input.trim()}
              className="btn-glow"
            />
          </div>
        )}

        {showSubmit && !showApproval && !showApprovalGate && (
          <div className="action-row">
            <Button block onClick={() => prepareApproval()}>
              合规预检
            </Button>
            <Button type="primary" block size="large" onClick={async () => {
              setShowApprovalGate(true)
              if (!project.approvalPreview) await prepareApproval()
            }} className="btn-glow">
              提交三级审批
            </Button>
          </div>
        )}

        {showApprovalWaiting && (
          <Alert
            type="info"
            showIcon
            message={`当前身份「${ACTOR_ROLE_LABELS[actorRole]}」无权操作 L${pendingLevelForGate} 审批`}
            description="请在顶部切换为对应审批人或平台管理员"
            style={{ marginBottom: 12 }}
          />
        )}

        {showApproval && (
          <div className="action-row">
            <Button
              type="primary"
              block
              size="large"
              onClick={() => setApprovalModalOpen(true)}
              className="btn-glow"
            >
              {approvalLevel === 0
                ? '一级审批操作'
                : approvalLevel === 1
                  ? '二级审批操作'
                  : '三级审批操作（可归档）'}
            </Button>
          </div>
        )}

        <ApprovalActionModal
          open={approvalModalOpen}
          level={pendingLevel}
          role={pendingRole}
          onClose={() => setApprovalModalOpen(false)}
          onSubmit={processApproval}
        />

        {project.status === 'archived' && (
          <div className="archived-hint">已归档 · 可在上方推送到 Jira / 飞书项目</div>
        )}
      </div>
    </div>
  )
}
