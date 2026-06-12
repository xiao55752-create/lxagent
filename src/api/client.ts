import type { ApprovalAnalytics, ApprovalRolesConfig, ContextRuleItem, IntegrationAnalytics, IntegrationConfig, InitiationProject, SimilarCase } from '../types'

const API_BASE = import.meta.env.VITE_API_BASE || '/api'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || res.statusText)
  }
  return res.json()
}

export interface KbDocument {
  id: string
  title: string
  kbType: string
  content: string
  metadata: Record<string, string>
  createdAt: string
  updatedAt: string
}

export interface RagResult {
  chunkId: string
  docId: string
  title: string
  kbType: string
  content: string
  score: number
}

export const api = {
  health: () =>
    request<{ ok: boolean; llmConfigured: boolean; kb: { documents: number; chunks: number } }>(
      '/health',
    ),

  listInitiations: () => request<{ items: InitiationProject[] }>('/initiations'),

  getApprovalAnalytics: () => request<{ analytics: ApprovalAnalytics }>('/analytics/approval'),

  getIntegrationAnalytics: () => request<{ analytics: IntegrationAnalytics }>('/analytics/integrations'),

  getSimilarCases: (id: string) => request<{ cases: SimilarCase[] }>(`/initiations/${id}/similar-cases`),

  getContextRules: (id: string) =>
    request<{ rules: ContextRuleItem[] }>(`/initiations/${id}/context-rules`),

  getApprovalRoles: () => request<{ config: ApprovalRolesConfig }>('/config/approval-roles'),

  updateApprovalRoles: (config: ApprovalRolesConfig) =>
    request<{ config: ApprovalRolesConfig }>('/config/approval-roles', {
      method: 'PUT',
      body: JSON.stringify(config),
    }),

  getIntegrationConfig: () => request<{ config: IntegrationConfig }>('/config/integrations'),

  updateIntegrationConfig: (config: Partial<IntegrationConfig>) =>
    request<{ config: IntegrationConfig }>('/config/integrations', {
      method: 'PUT',
      body: JSON.stringify(config),
    }),

  pushIntegration: (id: string, target: 'jira' | 'feishu') =>
    request<{ project: InitiationProject }>(`/initiations/${id}/push-integration`, {
      method: 'POST',
      body: JSON.stringify({ target }),
    }),

  createInitiation: () => request<{ project: InitiationProject }>('/initiations', { method: 'POST' }),

  getInitiation: (id: string) => request<{ project: InitiationProject }>(`/initiations/${id}`),

  chat: (id: string, message: string) =>
    request<{ project: InitiationProject }>(`/initiations/${id}/chat`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    }),

  setAutonomy: (id: string, level: string) =>
    request<{ project: InitiationProject }>(`/initiations/${id}/autonomy`, {
      method: 'POST',
      body: JSON.stringify({ level }),
    }),

  setFocus: (id: string, phaseId: string | null) =>
    request<{ project: InitiationProject }>(`/initiations/${id}/focus`, {
      method: 'POST',
      body: JSON.stringify({ phaseId }),
    }),

  executePlan: (id: string) =>
    request<{ project: InitiationProject }>(`/initiations/${id}/execute-plan`, {
      method: 'POST',
    }),

  executePlanStep: (id: string, stepId: string) =>
    request<{ project: InitiationProject }>(`/initiations/${id}/execute-plan-step`, {
      method: 'POST',
      body: JSON.stringify({ stepId }),
    }),

  skipPlanStep: (id: string, stepId: string) =>
    request<{ project: InitiationProject }>(`/initiations/${id}/skip-plan-step`, {
      method: 'POST',
      body: JSON.stringify({ stepId }),
    }),

  dismissPlan: (id: string) =>
    request<{ project: InitiationProject }>(`/initiations/${id}/dismiss-plan`, {
      method: 'POST',
    }),

  rollback: (id: string) =>
    request<{ project: InitiationProject }>(`/initiations/${id}/rollback`, {
      method: 'POST',
    }),

  answer: (id: string, answer: string) =>
    request<{ project: InitiationProject }>(`/initiations/${id}/answer`, {
      method: 'POST',
      body: JSON.stringify({ answer }),
    }),

  advance: (id: string) =>
    request<{ project: InitiationProject }>(`/initiations/${id}/advance`, { method: 'POST' }),

  confirmMaterial: (id: string, materialType: string) =>
    request<{ project: InitiationProject }>(`/initiations/${id}/confirm-material`, {
      method: 'POST',
      body: JSON.stringify({ materialType }),
    }),

  submit: (id: string) =>
    request<{ project: InitiationProject }>(`/initiations/${id}/submit`, { method: 'POST' }),

  prepareApproval: (id: string) =>
    request<{ project: InitiationProject }>(`/initiations/${id}/prepare-approval`, {
      method: 'POST',
    }),

  assessGoNoGo: (id: string) =>
    request<{ project: InitiationProject }>(`/initiations/${id}/assess-go-nogo`, {
      method: 'POST',
    }),

  approve: (
    id: string,
    body: {
      level: 1 | 2 | 3
      decision: 'approve' | 'conditional' | 'reject'
      opinion?: string
      conditions?: string[]
    },
  ) =>
    request<{ project: InitiationProject }>(`/initiations/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  ask: (id: string, question: string) =>
    request<{ project: InitiationProject }>(`/initiations/${id}/ask`, {
      method: 'POST',
      body: JSON.stringify({ question }),
    }),

  compliance: (id: string) =>
    request<{ project: InitiationProject }>(`/initiations/${id}/compliance`),

  listKbDocuments: () =>
    request<{ documents: KbDocument[]; stats: { documents: number; chunks: number; byType: Record<string, number> } }>(
      '/kb/documents',
    ),

  getKbDocument: (id: string) => request<{ document: KbDocument }>(`/kb/documents/${id}`),

  searchKb: (q: string, kbType?: string) =>
    request<{ results: RagResult[] }>(
      `/kb/search?q=${encodeURIComponent(q)}${kbType ? `&kbType=${kbType}` : ''}`,
    ),

  addKbDocument: (body: { title: string; kbType: string; content: string }) =>
    request<{ document: KbDocument }>('/kb/documents', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
}
