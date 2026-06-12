import { useState } from 'react'
import { Input, Modal, Radio, Space, Tag } from 'antd'
import type { ApprovalRoleLevel } from '../../types'

export interface ApprovalDecisionPayload {
  level: 1 | 2 | 3
  decision: 'approve' | 'conditional' | 'reject'
  opinion: string
  conditions: string[]
}

interface Props {
  open: boolean
  level: 1 | 2 | 3
  role?: ApprovalRoleLevel
  onClose: () => void
  onSubmit: (payload: ApprovalDecisionPayload) => Promise<void>
}

export default function ApprovalActionModal({ open, level, role, onClose, onSubmit }: Props) {
  const [decision, setDecision] = useState<'approve' | 'conditional' | 'reject'>('approve')
  const [opinion, setOpinion] = useState('')
  const [conditions, setConditions] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleOk = async () => {
    setSubmitting(true)
    try {
      await onSubmit({
        level,
        decision,
        opinion: opinion.trim() || (decision === 'approve' ? '审批通过' : '需补充修改'),
        conditions: conditions
          .split(/[,，；;]/)
          .map((s) => s.trim())
          .filter(Boolean),
      })
      setOpinion('')
      setConditions('')
      setDecision('approve')
      onClose()
    } finally {
      setSubmitting(false)
    }
  }

  const isL3 = level === 3

  return (
    <Modal
      title={`${role?.title ?? `L${level} 审批`} · ${role?.assignee ?? role?.role ?? ''}`}
      open={open}
      onCancel={onClose}
      onOk={handleOk}
      confirmLoading={submitting}
      okText={decision === 'reject' ? '确认驳回' : '提交审批意见'}
      okButtonProps={{ danger: decision === 'reject' }}
      width={520}
    >
      {role?.focusPoints?.length ? (
        <div className="approval-modal-focus">
          <span>关注要点：</span>
          {role.focusPoints.map((p) => (
            <Tag key={p}>{p}</Tag>
          ))}
        </div>
      ) : null}

      <div className="approval-modal-field">
        <label>审批结论</label>
        <Radio.Group value={decision} onChange={(e) => setDecision(e.target.value)}>
          <Space direction="vertical">
            <Radio value="approve">通过</Radio>
            {isL3 && <Radio value="conditional">附条件通过（仅三级）</Radio>}
            <Radio value="reject">驳回</Radio>
          </Space>
        </Radio.Group>
      </div>

      <div className="approval-modal-field">
        <label>审批意见</label>
        <Input.TextArea
          value={opinion}
          onChange={(e) => setOpinion(e.target.value)}
          placeholder="填写审批意见或补充说明..."
          autoSize={{ minRows: 2, maxRows: 4 }}
        />
      </div>

      {decision === 'conditional' && (
        <div className="approval-modal-field">
          <label>附条件（逗号分隔）</label>
          <Input.TextArea
            value={conditions}
            onChange={(e) => setConditions(e.target.value)}
            placeholder="PoC 验证核心指标, 锁定 2 家标杆客户意向"
            autoSize={{ minRows: 2, maxRows: 3 }}
          />
        </div>
      )}
    </Modal>
  )
}
