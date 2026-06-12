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

export interface ChatMessage {
  id: string
  role: MessageRole
  content: string
  timestamp: number
  actions?: AgentAction[]
}

export interface Material {
  id: string
  materialType: string
  title: string
  content: string
  version: number
  status: MaterialStatus
  sourceDocIds: string[]
  provenance?: MaterialProvenance
  generatedBy: string
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
  funnel: { stage: string; label: string; count: number }[]
  topIssues: { issue: string; count: number }[]
  recentApprovals: {
    projectId: string
    projectNo: string
    title: string
    level: number
    decision: string
    decidedAt: string
  }[]
}

export interface IntegrationPushSummary {
  projectId: string
  projectNo: string
  projectTitle: string
  target: 'jira' | 'feishu'
  externalId: string
  url: string
  summary: string
  status: 'success' | 'failed'
  pushedAt: string
}

export interface WebhookLogEntry {
  id: string
  projectId: string
  projectNo: string
  projectTitle: string
  target: 'jira' | 'feishu'
  externalId: string
  url: string
  summary: string
  webhookSent: boolean
  webhookError?: string
  pushedAt: string
}

export interface IntegrationAnalytics {
  generatedAt: string
  totals: {
    pushes: number
    jira: number
    feishu: number
    webhookSuccess: number
    webhookFailed: number
  }
  recentPushes: IntegrationPushSummary[]
  webhookLogs: WebhookLogEntry[]
}

export interface SimilarCase {
  id: string
  projectNo?: string
  projectId?: string
  title: string
  snippet: string
  score: number
  outcome?: string
  budget?: string
  projectType?: string
  source: 'kb' | 'archive'
}

export interface ApprovalRecord {
  id: string
  level: 1 | 2 | 3
  approver: string
  decision: string
  opinion: string
  conditions: string[]
  decidedAt: string
}

export interface ApprovalRoleLevel {
  level: 1 | 2 | 3
  title: string
  role: string
  assignee: string
  focusPoints: string[]
}

export interface DepartmentApproverMapping {
  department: string
  assignee: string
}

export interface ApprovalRolesConfig {
  levels: ApprovalRoleLevel[]
  departmentMappings?: DepartmentApproverMapping[]
  updatedAt: string
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

export interface IntegrationConfig {
  jiraBaseUrl: string
  feishuBaseUrl: string
  jiraProjectKey: string
  feishuProjectId: string
  jiraWebhookUrl?: string
  feishuWebhookUrl?: string
  webhookEnabled?: boolean
  updatedAt: string
}

export interface ContextRuleItem {
  chunkId: string
  docId: string
  title: string
  kbType: string
  excerpt: string
  score: number
}

export type PreReviewRecommendation = 'approve' | 'conditional' | 'reject' | 'supplement'

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
  checklist: { id: string; label: string; ok: boolean; hint?: string }[]
  matrix: ComplianceMatrixRow[]
  report: ApprovalPreReviewReport
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
  finalDecision: string
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
  agentTask?: string | null
  autonomyLevel?: AutonomyLevel
  agentPlan?: AgentPlan | null
  approvalPreview?: ApprovalPreview | null
  goNoGoAssessment?: GoNoGoAssessment | null
  agentSnapshots?: AgentSnapshot[]
  archive?: {
    archivedAt: string
    projectNo: string
    title: string
    materialCount: number
  }
  integrationPushes?: IntegrationPush[]
  createdAt: string
  updatedAt: string
  submittedAt?: string
  archivedAt?: string
}

export const STATUS_LABELS: Record<InitiationStatus, string> = {
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

export const STATUS_COLORS: Record<InitiationStatus, string> = {
  draft: 'default',
  collecting: 'processing',
  material_ready: 'cyan',
  pending_l1: 'orange',
  pending_l2: 'orange',
  pending_l3: 'orange',
  approved: 'success',
  conditional: 'gold',
  rejected: 'error',
  archived: 'purple',
}

export interface PhaseDefinition {
  id: PhaseId
  title: string
  subtitle: string
  icon: string
  reportKey?: string
  reportTitle?: string
}

export interface QuestionDef {
  id: string
  text: string
  placeholder?: string
  suggestions?: string[]
  type?: 'text' | 'select'
  options?: string[]
}
