import { useEffect, useState } from 'react'
import { Button, Form, Input, Modal, message } from 'antd'
import { MinusCircleOutlined, PlusOutlined, SettingOutlined } from '@ant-design/icons'
import { api } from '../../api/client'
import type { ApprovalRoleLevel, DepartmentApproverMapping } from '../../types'

interface Props {
  trigger?: 'button' | 'link'
}

export default function ApprovalRolesSettings({ trigger = 'button' }: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [levels, setLevels] = useState<ApprovalRoleLevel[]>([])
  const [mappings, setMappings] = useState<DepartmentApproverMapping[]>([])
  const [form] = Form.useForm()

  const load = async () => {
    setLoading(true)
    try {
      const { config } = await api.getApprovalRoles()
      setLevels(config.levels)
      setMappings(config.departmentMappings || [])
      form.setFieldsValue({
        levels: config.levels.map((l) => ({
          ...l,
          focusPoints: l.focusPoints.join('、'),
        })),
        departmentMappings: config.departmentMappings?.length
          ? config.departmentMappings
          : [{ department: '', assignee: '' }],
      })
    } catch {
      message.error('无法加载审批角色配置')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open) load()
  }, [open])

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      setSaving(true)
      const nextLevels: ApprovalRoleLevel[] = (values.levels as Array<ApprovalRoleLevel & { focusPoints: string }>).map(
        (l, i) => ({
          level: (i + 1) as 1 | 2 | 3,
          title: l.title,
          role: l.role,
          assignee: l.assignee,
          focusPoints: String(l.focusPoints || '')
            .split(/[,，、]/)
            .map((s) => s.trim())
            .filter(Boolean),
        }),
      )
      const departmentMappings: DepartmentApproverMapping[] = (values.departmentMappings || [])
        .filter((m: DepartmentApproverMapping) => m.department?.trim() && m.assignee?.trim())
        .map((m: DepartmentApproverMapping) => ({
          department: m.department.trim(),
          assignee: m.assignee.trim(),
        }))

      await api.updateApprovalRoles({ levels: nextLevels, departmentMappings, updatedAt: '' })
      message.success('审批角色配置已保存')
      setOpen(false)
    } catch {
      message.error('保存失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      {trigger === 'link' ? (
        <button type="button" className="settings-link-btn" onClick={() => setOpen(true)}>
          <SettingOutlined /> 审批角色配置
        </button>
      ) : (
        <Button icon={<SettingOutlined />} onClick={() => setOpen(true)}>
          审批角色
        </Button>
      )}

      <Modal
        title="三级审批角色配置"
        open={open}
        onCancel={() => setOpen(false)}
        onOk={handleSave}
        confirmLoading={saving}
        width={680}
        okText="保存"
      >
        {loading && !levels.length ? (
          <p>加载中...</p>
        ) : (
          <Form form={form} layout="vertical">
            {levels.map((_, index) => (
              <div key={index} className="approval-role-form-block">
                <h4>L{index + 1} 审批</h4>
                <Form.Item name={['levels', index, 'title']} label="节点名称" rules={[{ required: true }]}>
                  <Input placeholder="一级审批" />
                </Form.Item>
                <Form.Item name={['levels', index, 'role']} label="角色名称" rules={[{ required: true }]}>
                  <Input placeholder="部门负责人" />
                </Form.Item>
                <Form.Item name={['levels', index, 'assignee']} label="默认审批人/委员会" rules={[{ required: true }]}>
                  <Input placeholder="未匹配部门时使用" />
                </Form.Item>
                <Form.Item name={['levels', index, 'focusPoints']} label="关注要点（逗号分隔）">
                  <Input placeholder="职责范围, 部门人力" />
                </Form.Item>
              </div>
            ))}

            <div className="approval-role-form-block">
              <h4>部门 → 一级审批人映射</h4>
              <p className="approval-role-form-hint">立项单提交审批时，按提出部门自动匹配 L1 审批人</p>
              <Form.List name="departmentMappings">
                {(fields, { add, remove }) => (
                  <>
                    {fields.map((field) => (
                      <div key={field.key} className="dept-mapping-row">
                        <Form.Item
                          {...field}
                          name={[field.name, 'department']}
                          rules={[{ required: true, message: '填写部门' }]}
                          className="dept-mapping-field"
                        >
                          <Input placeholder="产品部" />
                        </Form.Item>
                        <Form.Item
                          {...field}
                          name={[field.name, 'assignee']}
                          rules={[{ required: true, message: '填写审批人' }]}
                          className="dept-mapping-field"
                        >
                          <Input placeholder="李四" />
                        </Form.Item>
                        <Button
                          type="text"
                          danger
                          icon={<MinusCircleOutlined />}
                          onClick={() => remove(field.name)}
                          aria-label="删除"
                        />
                      </div>
                    ))}
                    <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                      添加部门映射
                    </Button>
                  </>
                )}
              </Form.List>
              {!mappings.length && !loading && (
                <p className="approval-role-form-hint">暂无映射时将使用 L1 默认审批人</p>
              )}
            </div>
          </Form>
        )}
      </Modal>
    </>
  )
}
