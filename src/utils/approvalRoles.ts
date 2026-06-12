import type { ApprovalRolesConfig } from '../types'

export function resolveDepartmentAssignee(
  department: string,
  config: ApprovalRolesConfig,
): string | null {
  if (!department?.trim()) return null
  const mappings = config.departmentMappings || []
  const hit = mappings.find(
    (m) => department.includes(m.department) || m.department.includes(department),
  )
  return hit?.assignee ?? null
}

export function resolveApproverLabel(
  level: 1 | 2 | 3,
  config: ApprovalRolesConfig,
  department?: string,
): string {
  const role = config.levels.find((l) => l.level === level)
  if (!role) return `L${level} 审批人`
  if (level === 1 && department) {
    const mapped = resolveDepartmentAssignee(department, config)
    if (mapped) return `${mapped}（${role.role}）`
  }
  return `${role.assignee}（${role.role}）`
}
