import { Button } from 'antd'
import { UndoOutlined } from '@ant-design/icons'

interface Props {
  label: string
  onRollback: () => void
  loading?: boolean
}

export default function AgentUndoBar({ label, onRollback, loading }: Props) {
  return (
    <div className="agent-undo-bar">
      <span>↩ 可撤销：{label}</span>
      <Button size="small" icon={<UndoOutlined />} loading={loading} onClick={onRollback}>
        撤销上一步
      </Button>
    </div>
  )
}
