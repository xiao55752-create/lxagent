import { useEffect, useState } from 'react'
import { Button, message } from 'antd'
import { LinkOutlined } from '@ant-design/icons'
import { api } from '../../api/client'
import type { InitiationProject, IntegrationConfig } from '../../types'

interface Props {
  project: InitiationProject
  onUpdate: (project: InitiationProject) => void
}

const TARGETS = [
  { id: 'jira' as const, label: 'Jira', icon: '🎫', desc: '创建执行任务工单' },
  { id: 'feishu' as const, label: '飞书项目', icon: '📋', desc: '同步至项目空间' },
]

export default function ArchivePushPanel({ project, onUpdate }: Props) {
  const [pushing, setPushing] = useState<string | null>(null)
  const [integrationConfig, setIntegrationConfig] = useState<IntegrationConfig | null>(null)

  useEffect(() => {
    api.getIntegrationConfig().then(({ config }) => setIntegrationConfig(config)).catch(() => {})
  }, [])

  if (project.status !== 'archived') return null

  const pushes = project.integrationPushes || []

  const handlePush = async (target: 'jira' | 'feishu') => {
    setPushing(target)
    try {
      const { project: updated } = await api.pushIntegration(project.id, target)
      onUpdate(updated)
      message.success(`已推送到 ${target === 'jira' ? 'Jira' : '飞书项目'}`)
    } catch (e) {
      message.error(String(e))
    } finally {
      setPushing(null)
    }
  }

  return (
    <div className="archive-push-panel">
      <div className="archive-push-header">
        <strong>🔗 归档后推送</strong>
        <span>
          将立项结果同步至项目执行系统
          {integrationConfig?.webhookEnabled && ' · Webhook 已启用'}
        </span>
      </div>
      <div className="archive-push-grid">
        {TARGETS.map((t) => {
          const done = pushes.find((p) => p.target === t.id && p.status === 'success')
          return (
            <div key={t.id} className={`archive-push-card ${done ? 'done' : ''}`}>
              <span className="archive-push-icon">{t.icon}</span>
              <div>
                <strong>{t.label}</strong>
                <p>{done ? done.summary : t.desc}</p>
                {done && (
                  <a href={done.url} target="_blank" rel="noreferrer" className="archive-push-link">
                    <LinkOutlined /> {done.externalId}
                  </a>
                )}
              </div>
              <Button
                size="small"
                type={done ? 'default' : 'primary'}
                loading={pushing === t.id}
                onClick={() => handlePush(t.id)}
              >
                {done ? '重新推送' : '推送'}
              </Button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
