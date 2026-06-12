export type KbType =
  | 'policy_process'
  | 'policy_approval'
  | 'standard_tech_compliance'
  | 'template_format'
  | 'reference_case'

export type InitiationStatus =
  | 'draft'
  | 'collecting'
  | 'material_ready'
  | 'pending_l1'
  | 'pending_l2'
  | 'pending_l3'
  | 'approved'
  | 'conditional'
  | 'rejected'
  | 'archived'

export type MaterialStatus = 'draft' | 'confirmed' | 'locked'
export type MaterialType =
  | 'market'
  | 'competitive'
  | 'product'
  | 'technical'
  | 'feasibility'
  | 'budget'
  | 'approval_l1'
  | 'approval_l2'
  | 'approval_l3'

export type PhaseId =
  | 'setup'
  | 'background'
  | 'market'
  | 'competitive'
  | 'product'
  | 'technical'
  | 'feasibility'
  | 'budget'
  | 'approval'
  | 'complete'

export type PhaseStatus = 'pending' | 'active' | 'completed'
export type MessageRole = 'agent' | 'user' | 'system'
export type AutonomyLevel = 'suggest' | 'draft' | 'execute'

export interface AgentPlanStep {
  id: string
  phaseId: PhaseId
  title: string
  action: 'complete_phase' | 'generate_material'
  status: 'pending' | 'running' | 'done' | 'failed' | 'skipped'
}

export interface AgentPlan {
  steps: AgentPlanStep[]
  createdAt: number
}

/** 智能体执行前快照，用于撤销 */
export interface AgentSnapshot {
  id: string
  label: string
  createdAt: number
  currentPhase: PhaseId
  focusPhase?: PhaseId | null
  phaseStatuses: Record<PhaseId, PhaseStatus>
  answers: Record<string, string>
  materials: Material[]
  agentPlan: AgentPlan | null
  status: InitiationStatus
  title: string
  proposer: string
  department: string
  projectType: string
  budgetRange: string
  currentNode: string
}

export interface AgentAction {
  type: 'extract' | 'phase' | 'material' | 'evidence' | 'plan'
  label: string
  detail?: string
  meta?: Record<string, string>
}

export interface KbDocument {
  id: string
  title: string
  kbType: KbType
  content: string
  metadata: Record<string, string>
  createdAt: string
  updatedAt: string
}

export interface KbChunk {
  id: string
  docId: string
  title: string
  kbType: KbType
  content: string
  metadata: Record<string, string>
  tokens: string[]
}

export interface RagResult {
  chunkId: string
  docId: string
  title: string
  kbType: KbType
  content: string
  score: number
  metadata: Record<string, string>
}

export interface ChatMessage {
  id: string
  role: MessageRole
  content: string
  timestamp: number
  actions?: AgentAction[]
}

export interface Material {
  id: string
  materialType: MaterialType | string
  title: string
  content: string
  version: number
  status: MaterialStatus
  sourceDocIds: string[]
  provenance?: MaterialProvenance
  generatedBy: 'ai' | 'user' | 'system'
  confirmedAt?: string
  lockedAt?: string
  createdAt: string
}

export interface MaterialProvenance {
  materialType: string
  phaseId?: PhaseId
  answerFields: string[]
  sourceDocIds: string[]
  chatMessageIds: string[]
  fieldSnapshots: Record<string, string>
  generatedAt: string
}

export type GoNoGoVerdict = 'go' | 'conditional' | 'no_go'

export interface GoNoGoDimension {
  id: string
  label: string
  score: number
  weight: number
  status: 'strong' | 'moderate' | 'weak' | 'unknown'
  summary: string
}

export interface GoNoGoAssessment {
  overallScore: number
  verdict: GoNoGoVerdict
  verdictLabel: string
  summary: string
  dimensions: GoNoGoDimension[]
  keyStrengths: string[]
  keyRisks: string[]
  assessedAt: string
  generatedBy: 'rules' | 'llm'
}

export interface ApprovalRecord {
  id: string
  level: 1 | 2 | 3
  approver: string
  decision: 'approve' | 'conditional' | 'reject'
  opinion: string
  conditions: string[]
  decidedAt: string
}

export interface ApprovalCheckItem {
  id: string
  label: string
  ok: boolean
  hint?: string
}

export type ComplianceCellStatus = 'pass' | 'fail' | 'warn' | 'pending' | 'na'

export interface ComplianceMatrixRow {
  id: string
  category: string
  requirement: string
  source: string
  status: ComplianceCellStatus
  evidence?: string
  materialType?: string
  blocking: boolean
}

export type PreReviewRecommendation = 'approve' | 'conditional' | 'reject' | 'supplement'

export interface ApprovalPreReviewReport {
  recommendation: PreReviewRecommendation
  recommendationLabel: string
  confidence: number
  predictedPassRate: number
  summary: string
  conflicts: string[]
  risks: string[]
  suggestedActions: string[]
  generatedBy: 'rules' | 'llm'
}

export interface ApprovalPreview {
  checkedAt: string
  ready: boolean
  checklist: ApprovalCheckItem[]
  matrix: ComplianceMatrixRow[]
  report: ApprovalPreReviewReport
}

export interface ArchivePackage {
  archivedAt: string
  projectNo: string
  title: string
  version: number
  materialCount: number
  approvalCount: number
  ruleRefDocIds: string[]
}

export interface IntegrationPush {
  id: string
  target: 'jira' | 'feishu'
  status: 'success' | 'failed'
  externalId: string
  url: string
  summary: string
  pushedAt: string
}

export interface InitiationProject {
  id: string
  projectNo: string
  title: string
  status: InitiationStatus
  currentNode: string
  version: number
  proposer: string
  department: string
  projectType: string
  expectedStart: string
  duration: string
  budgetRange: string
  approvalLevel: 0 | 1 | 2 | 3
  finalDecision: 'pending' | 'approved' | 'conditional' | 'rejected'
  currentPhase: PhaseId
  focusPhase?: PhaseId | null
  phaseStatuses: Record<PhaseId, PhaseStatus>
  currentQuestionIndex: number
  answers: Record<string, string>
  materials: Material[]
  messages: ChatMessage[]
  approvals: ApprovalRecord[]
  ruleRefs: string[]
  complianceWarnings: string[]
  validationWarnings: string[]
  /** 智能体当前后台任务描述，供侧边栏展示 */
  agentTask?: string | null
  /** 自主度：建议 / 草稿 / 自动 */
  autonomyLevel?: AutonomyLevel
  /** 待确认的执行计划（建议模式下） */
  agentPlan?: AgentPlan | null
  /** 提交审批前的合规预检结果 */
  approvalPreview?: ApprovalPreview | null
  /** 可撤销的执行快照栈（最近 8 条） */
  agentSnapshots?: AgentSnapshot[]
  /** Go/No-Go 立项评分 */
  goNoGoAssessment?: GoNoGoAssessment | null
  archive?: ArchivePackage
  integrationPushes?: IntegrationPush[]
  createdAt: string
  updatedAt: string
  submittedAt?: string
  archivedAt?: string
}

export interface GenerateReportRequest {
  phase: string
  answers: Record<string, string>
  meta: { name: string; projectType: string; proposer: string } | null
  reports: Record<string, string>
}

export interface GenerateReportResponse {
  markdown: string
  sources: RagResult[]
  warnings: string[]
  mode: 'llm' | 'rag-template'
}

export const INITIATION_STATUS_LABELS: Record<InitiationStatus, string> = {
  draft: '草稿',
  collecting: '采集中',
  material_ready: '材料就绪',
  pending_l1: '一级审批中',
  pending_l2: '二级审批中',
  pending_l3: '三级审批中',
  approved: '已通过',
  conditional: '附条件通过',
  rejected: '已驳回',
  archived: '已归档',
}
