import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { DATA_DIR } from '../config.js'

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

const CONFIG_PATH = `${DATA_DIR}/approval-roles.json`

export const DEFAULT_APPROVAL_ROLES: ApprovalRolesConfig = {
  updatedAt: new Date().toISOString(),
  departmentMappings: [
    { department: '产品部', assignee: '李四' },
    { department: '研发部', assignee: '王五' },
    { department: '市场部', assignee: '赵六' },
    { department: '销售部', assignee: '钱七' },
  ],
  levels: [
    {
      level: 1,
      title: '一级审批',
      role: '部门负责人',
      assignee: '部门负责人（待指定）',
      focusPoints: ['职责范围', '部门人力', '年度目标价值'],
    },
    {
      level: 2,
      title: '二级审批',
      role: '产品/技术委员会',
      assignee: '产品技术委员会（待指定）',
      focusPoints: ['市场机会', '技术可行性', '差异化', 'ROI'],
    },
    {
      level: 3,
      title: '三级审批',
      role: '公司决策层',
      assignee: '立项委员会（待指定）',
      focusPoints: ['战略价值', '总投入回报', '风险止损', '优先级'],
    },
  ],
}

function ensureDataDir() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true })
}

export function getApprovalRoles(): ApprovalRolesConfig {
  ensureDataDir()
  if (!existsSync(CONFIG_PATH)) {
    saveApprovalRoles(DEFAULT_APPROVAL_ROLES)
    return DEFAULT_APPROVAL_ROLES
  }
  try {
    const raw = JSON.parse(readFileSync(CONFIG_PATH, 'utf-8')) as ApprovalRolesConfig
    if (!raw.levels?.length) return DEFAULT_APPROVAL_ROLES
    return raw
  } catch {
    return DEFAULT_APPROVAL_ROLES
  }
}

export function saveApprovalRoles(config: ApprovalRolesConfig): ApprovalRolesConfig {
  ensureDataDir()
  const next: ApprovalRolesConfig = {
    ...config,
    updatedAt: new Date().toISOString(),
    departmentMappings: (config.departmentMappings || []).map((m) => ({
      department: m.department.trim(),
      assignee: m.assignee.trim(),
    })).filter((m) => m.department && m.assignee),
    levels: config.levels.map((l) => ({
      ...l,
      level: l.level as 1 | 2 | 3,
      focusPoints: l.focusPoints || [],
    })),
  }
  writeFileSync(CONFIG_PATH, JSON.stringify(next, null, 2), 'utf-8')
  return next
}

export function getRoleForLevel(level: 1 | 2 | 3): ApprovalRoleLevel {
  const config = getApprovalRoles()
  return config.levels.find((l) => l.level === level) ?? DEFAULT_APPROVAL_ROLES.levels[level - 1]
}

export function resolveDepartmentAssignee(department: string): string | null {
  if (!department?.trim()) return null
  const mappings = getApprovalRoles().departmentMappings || []
  const hit = mappings.find(
    (m) => department.includes(m.department) || m.department.includes(department),
  )
  return hit?.assignee ?? null
}

export function formatApproverLabel(level: 1 | 2 | 3, department?: string): string {
  const role = getRoleForLevel(level)
  if (level === 1 && department) {
    const mapped = resolveDepartmentAssignee(department)
    if (mapped) return `${mapped}（${role.role}）`
  }
  return `${role.assignee}（${role.role}）`
}
