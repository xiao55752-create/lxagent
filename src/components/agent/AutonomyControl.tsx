import { Segmented, Tooltip } from 'antd'
import { BulbOutlined, EditOutlined, ThunderboltOutlined } from '@ant-design/icons'
import type { AutonomyLevel } from '../../types'

const OPTIONS = [
  {
    value: 'suggest' as AutonomyLevel,
    label: (
      <Tooltip title="只提取信息并展示计划，不自动执行">
        <span><BulbOutlined /> 建议</span>
      </Tooltip>
    ),
  },
  {
    value: 'draft' as AutonomyLevel,
    label: (
      <Tooltip title="自动执行但材料保留为草稿">
        <span><EditOutlined /> 草稿</span>
      </Tooltip>
    ),
  },
  {
    value: 'execute' as AutonomyLevel,
    label: (
      <Tooltip title="全自动推进流程并归档材料">
        <span><ThunderboltOutlined /> 自动</span>
      </Tooltip>
    ),
  },
]

interface Props {
  value: AutonomyLevel
  disabled?: boolean
  onChange: (level: AutonomyLevel) => void
}

export default function AutonomyControl({ value, disabled, onChange }: Props) {
  return (
    <div className="autonomy-control">
      <span className="autonomy-label">自主度</span>
      <Segmented
        size="small"
        options={OPTIONS}
        value={value}
        disabled={disabled}
        onChange={(v) => onChange(v as AutonomyLevel)}
      />
    </div>
  )
}
