import { useEffect, useState } from 'react'
import { Button, Form, Input, Modal, Switch, message } from 'antd'
import { ApiOutlined } from '@ant-design/icons'
import { api } from '../../api/client'

export default function IntegrationSettings() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form] = Form.useForm()

  const load = async () => {
    setLoading(true)
    try {
      const { config } = await api.getIntegrationConfig()
      form.setFieldsValue(config)
    } catch {
      message.error('无法加载集成配置')
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
      await api.updateIntegrationConfig(values)
      message.success('集成配置已保存')
      setOpen(false)
    } catch {
      message.error('保存失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Button icon={<ApiOutlined />} onClick={() => setOpen(true)}>
        外部集成
      </Button>

      <Modal
        title="Jira / 飞书集成配置"
        open={open}
        onCancel={() => setOpen(false)}
        onOk={handleSave}
        confirmLoading={saving}
        width={580}
        okText="保存"
      >
        {loading ? (
          <p>加载中...</p>
        ) : (
          <Form form={form} layout="vertical">
            <p className="integration-settings-hint">
              归档推送时生成工单链接；开启 Webhook 后同步 POST 至外部系统（如 Zapier、企业自建网关）。
            </p>
            <Form.Item name="jiraBaseUrl" label="Jira 站点地址" rules={[{ required: true }]}>
              <Input placeholder="https://your-company.atlassian.net" />
            </Form.Item>
            <Form.Item name="jiraProjectKey" label="Jira 项目 Key" rules={[{ required: true }]}>
              <Input placeholder="INIT" />
            </Form.Item>
            <Form.Item name="jiraWebhookUrl" label="Jira Webhook URL（可选）">
              <Input placeholder="https://hooks.example.com/jira" />
            </Form.Item>
            <Form.Item name="feishuBaseUrl" label="飞书项目地址" rules={[{ required: true }]}>
              <Input placeholder="https://project.feishu.cn" />
            </Form.Item>
            <Form.Item name="feishuProjectId" label="飞书项目 ID" rules={[{ required: true }]}>
              <Input placeholder="your-project-id" />
            </Form.Item>
            <Form.Item name="feishuWebhookUrl" label="飞书 Webhook URL（可选）">
              <Input placeholder="https://open.feishu.cn/open-apis/bot/v2/hook/..." />
            </Form.Item>
            <Form.Item name="webhookEnabled" label="启用 Webhook 推送" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Form>
        )}
      </Modal>
    </>
  )
}
