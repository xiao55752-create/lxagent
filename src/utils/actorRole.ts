export type ActorRole = 'submitter' | 'l1' | 'l2' | 'l3' | 'admin'

const STORAGE_KEY = 'initiation-actor-role'

export const ACTOR_ROLE_LABELS: Record<ActorRole, string> = {
  submitter: '项目提交人',
  l1: '一级审批人',
  l2: '二级审批人',
  l3: '三级审批人',
  admin: '平台管理员',
}

export function getActorRole(): ActorRole {
  try {
    const v = localStorage.getItem(STORAGE_KEY) as ActorRole | null
    if (v && v in ACTOR_ROLE_LABELS) return v
  } catch {
    /* ignore */
  }
  return 'admin'
}

export function setActorRole(role: ActorRole) {
  localStorage.setItem(STORAGE_KEY, role)
}

/** 当前身份是否可对指定审批级别操作 */
export function canActOnApprovalLevel(role: ActorRole, level: 1 | 2 | 3): boolean {
  if (role === 'admin') return true
  if (role === 'l1' && level === 1) return true
  if (role === 'l2' && level === 2) return true
  if (role === 'l3' && level === 3) return true
  return false
}

export function pendingApprovalLevel(status: string): 1 | 2 | 3 | null {
  if (status === 'pending_l1') return 1
  if (status === 'pending_l2') return 2
  if (status === 'pending_l3') return 3
  return null
}
