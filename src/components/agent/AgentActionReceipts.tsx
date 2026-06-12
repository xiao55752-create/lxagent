import type { AgentAction } from '../../types'
import { materialTheme } from '../visual/VisualAssets'

const ACTION_ICONS: Record<AgentAction['type'], string> = {
  extract: '📝',
  phase: '✅',
  material: '📄',
  evidence: '📚',
  plan: '📋',
}

interface Props {
  actions: AgentAction[]
  onMaterialClick?: (materialType: string) => void
}

export default function AgentActionReceipts({ actions, onMaterialClick }: Props) {
  const visible = actions.filter((a) => a.type !== 'evidence')
  if (!visible.length) return null

  return (
    <div className="action-receipts">
      {visible.map((a, i) => (
        <button
          key={`${a.type}-${a.label}-${i}`}
          type="button"
          className={`action-receipt action-receipt-${a.type}`}
          onClick={() => {
            if (a.type === 'material' && a.meta?.materialType && onMaterialClick) {
              onMaterialClick(a.meta.materialType)
            }
          }}
          disabled={a.type !== 'material'}
        >
          <span className="action-receipt-icon">{ACTION_ICONS[a.type]}</span>
          <div className="action-receipt-body">
            <span className="action-receipt-label">{a.label}</span>
            {a.detail && <span className="action-receipt-detail">{a.detail}</span>}
          </div>
          {a.type === 'material' && a.meta?.materialType && (
            <span className="action-receipt-chip" style={{ background: materialTheme(a.meta.materialType).gradient }}>
              查看
            </span>
          )}
        </button>
      ))}
    </div>
  )
}
