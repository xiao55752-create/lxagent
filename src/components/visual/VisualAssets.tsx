import type { ReactNode } from 'react'
import type { PhaseId } from '../../types'

const PHASE_GRADIENTS: Record<PhaseId, [string, string]> = {
  setup: ['#6366f1', '#8b5cf6'],
  background: ['#f59e0b', '#f97316'],
  market: ['#06b6d4', '#0ea5e9'],
  competitive: ['#ef4444', '#f97316'],
  product: ['#a855f7', '#ec4899'],
  technical: ['#3b82f6', '#6366f1'],
  feasibility: ['#22c55e', '#10b981'],
  budget: ['#eab308', '#f59e0b'],
  approval: ['#f43f5e', '#e11d48'],
  complete: ['#14b8a6', '#06b6d4'],
}

export function phaseGradient(id: PhaseId): string {
  const [a, b] = PHASE_GRADIENTS[id] || ['#6366f1', '#8b5cf6']
  return `linear-gradient(135deg, ${a}, ${b})`
}

interface PhaseArtProps {
  phaseId: PhaseId
  size?: number
}

export function PhaseArt({ phaseId, size = 40 }: PhaseArtProps) {
  const gradient = phaseGradient(phaseId)

  const icons: Record<PhaseId, ReactNode> = {
    setup: (
      <>
        <rect x="8" y="6" width="24" height="28" rx="3" fill="white" fillOpacity="0.9" />
        <rect x="12" y="12" width="16" height="2" rx="1" fill="currentColor" fillOpacity="0.3" />
        <rect x="12" y="17" width="12" height="2" rx="1" fill="currentColor" fillOpacity="0.3" />
        <rect x="12" y="22" width="14" height="2" rx="1" fill="currentColor" fillOpacity="0.3" />
      </>
    ),
    background: (
      <>
        <circle cx="20" cy="18" r="10" fill="white" fillOpacity="0.25" />
        <path d="M20 10v16M14 16h12" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      </>
    ),
    market: (
      <>
        <rect x="10" y="22" width="5" height="10" rx="1" fill="white" fillOpacity="0.85" />
        <rect x="17" y="16" width="5" height="16" rx="1" fill="white" fillOpacity="0.85" />
        <rect x="24" y="10" width="5" height="22" rx="1" fill="white" fillOpacity="0.85" />
      </>
    ),
    competitive: (
      <>
        <path d="M12 28 L20 8 L28 28 Z" fill="white" fillOpacity="0.2" stroke="white" strokeWidth="2" />
        <circle cx="20" cy="22" r="3" fill="white" />
      </>
    ),
    product: (
      <>
        <circle cx="20" cy="20" r="12" fill="none" stroke="white" strokeWidth="2" />
        <circle cx="20" cy="20" r="5" fill="white" fillOpacity="0.9" />
      </>
    ),
    technical: (
      <>
        <rect x="8" y="12" width="10" height="10" rx="2" fill="white" fillOpacity="0.85" />
        <rect x="22" y="12" width="10" height="10" rx="2" fill="white" fillOpacity="0.85" />
        <rect x="15" y="26" width="10" height="6" rx="2" fill="white" fillOpacity="0.85" />
        <path d="M13 17h6M24 17h-6M20 22v4" stroke="currentColor" strokeOpacity="0.4" strokeWidth="1.5" />
      </>
    ),
    feasibility: (
      <>
        <path d="M10 20 L17 27 L30 13" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </>
    ),
    budget: (
      <>
        <circle cx="20" cy="20" r="11" fill="none" stroke="white" strokeWidth="2" />
        <text x="20" y="24" textAnchor="middle" fill="white" fontSize="12" fontWeight="700">
          ¥
        </text>
      </>
    ),
    approval: (
      <>
        <rect x="10" y="8" width="20" height="26" rx="2" fill="white" fillOpacity="0.85" />
        <path d="M15 16h10M15 21h7" stroke="currentColor" strokeOpacity="0.35" strokeWidth="2" strokeLinecap="round" />
      </>
    ),
    complete: (
      <>
        <path d="M20 8 L26 14 L20 32 L14 14 Z" fill="white" fillOpacity="0.25" stroke="white" strokeWidth="2" />
        <circle cx="20" cy="16" r="3" fill="white" />
      </>
    ),
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      className="phase-art"
      style={{ background: gradient, borderRadius: size * 0.28, color: '#fff', flexShrink: 0 }}
    >
      {icons[phaseId]}
    </svg>
  )
}

export function AgentAvatar({ size = 44 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" className="agent-avatar-svg">
      <defs>
        <linearGradient id="agentGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#06b6d4" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="14" fill="url(#agentGrad)" />
      <circle cx="24" cy="20" r="8" fill="white" fillOpacity="0.95" />
      <rect x="14" y="30" width="20" height="10" rx="5" fill="white" fillOpacity="0.85" />
      <circle cx="21" cy="19" r="1.5" fill="#6366f1" />
      <circle cx="27" cy="19" r="1.5" fill="#6366f1" />
      <path d="M21 23 Q24 25 27 23" stroke="#6366f1" strokeWidth="1.5" fill="none" strokeLinecap="round" />
    </svg>
  )
}

const MATERIAL_THEMES: Record<string, { gradient: string; emoji: string }> = {
  market: { gradient: 'linear-gradient(135deg, #0ea5e9, #06b6d4)', emoji: '📊' },
  competitive: { gradient: 'linear-gradient(135deg, #f97316, #ef4444)', emoji: '⚔️' },
  product: { gradient: 'linear-gradient(135deg, #a855f7, #ec4899)', emoji: '🎯' },
  technical: { gradient: 'linear-gradient(135deg, #6366f1, #3b82f6)', emoji: '🔧' },
  feasibility: { gradient: 'linear-gradient(135deg, #22c55e, #14b8a6)', emoji: '✅' },
  budget: { gradient: 'linear-gradient(135deg, #eab308, #f59e0b)', emoji: '💰' },
  approval_l1: { gradient: 'linear-gradient(135deg, #f43f5e, #e11d48)', emoji: '1️⃣' },
  approval_l2: { gradient: 'linear-gradient(135deg, #e11d48, #be123c)', emoji: '2️⃣' },
  approval_l3: { gradient: 'linear-gradient(135deg, #be123c, #9f1239)', emoji: '3️⃣' },
}

export function materialTheme(type: string) {
  return MATERIAL_THEMES[type] || { gradient: 'linear-gradient(135deg, #64748b, #475569)', emoji: '📄' }
}

export function MaterialCover({ type, title }: { type: string; title: string }) {
  const theme = materialTheme(type)
  return (
    <div className="material-cover" style={{ background: theme.gradient }}>
      <span className="material-cover-emoji">{theme.emoji}</span>
      <span className="material-cover-title">{title}</span>
    </div>
  )
}

export function FlowPipeline() {
  const steps = [
    { label: '自由对话', icon: '💬' },
    { label: '能力模块', icon: '🧩' },
    { label: '材料归档', icon: '📄' },
    { label: '合规预审', icon: '🛡️' },
    { label: '三级审批', icon: '✅' },
    { label: '案例入库', icon: '📦' },
  ]

  return (
    <div className="flow-pipeline">
      {steps.map((s, i) => (
        <div key={s.label} className="flow-pipeline-step">
          <div className="flow-pipeline-node">
            <span>{s.icon}</span>
          </div>
          <span className="flow-pipeline-label">{s.label}</span>
          {i < steps.length - 1 && <div className="flow-pipeline-connector" />}
        </div>
      ))}
    </div>
  )
}

export function EmptyMaterialsIllustration() {
  return (
    <svg width="160" height="120" viewBox="0 0 160 120" className="empty-illustration">
      <defs>
        <linearGradient id="folderGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#e0e7ff" />
          <stop offset="100%" stopColor="#cffafe" />
        </linearGradient>
      </defs>
      <rect x="30" y="35" width="100" height="70" rx="8" fill="url(#folderGrad)" />
      <path d="M30 50 h35 l8-10 h37 v65 H30 Z" fill="#6366f1" fillOpacity="0.15" />
      <rect x="50" y="60" width="60" height="6" rx="3" fill="#6366f1" fillOpacity="0.2" />
      <rect x="50" y="72" width="45" height="6" rx="3" fill="#06b6d4" fillOpacity="0.2" />
      <rect x="50" y="84" width="52" height="6" rx="3" fill="#6366f1" fillOpacity="0.15" />
      <circle cx="120" cy="30" r="16" fill="#fef3c7" />
      <text x="120" y="35" textAnchor="middle" fontSize="16">
        ✨
      </text>
    </svg>
  )
}
