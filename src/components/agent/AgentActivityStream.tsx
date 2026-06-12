import { useMemo } from 'react'
import type { ChatMessage } from '../../types'

interface StreamItem {
  id: string
  type: string
  label: string
  detail?: string
  time: number
}

interface Props {
  messages: ChatMessage[]
  agentTask?: string | null
}

export default function AgentActivityStream({ messages, agentTask }: Props) {
  const items = useMemo(() => {
    const stream: StreamItem[] = []
    for (const m of messages) {
      if (m.role !== 'agent' || !m.actions?.length) continue
      for (const a of m.actions) {
        stream.push({
          id: `${m.id}-${a.label}`,
          type: a.type,
          label: a.label,
          detail: a.detail,
          time: m.timestamp,
        })
      }
    }
    return stream.slice(-8).reverse()
  }, [messages])

  return (
    <div className="agent-activity-stream">
      <div className="agent-activity-header">
        <span>⚡ 智能体活动流</span>
        {agentTask && <span className="agent-activity-live">执行中</span>}
      </div>

      {agentTask && (
        <div className="agent-activity-current">
          <span className="pulse-dot" />
          {agentTask}
        </div>
      )}

      {items.length === 0 && !agentTask ? (
        <p className="agent-activity-empty">发送消息后，智能体的提取、分析、生成动作会实时显示在这里</p>
      ) : (
        <ul className="agent-activity-list">
          {items.map((item) => (
            <li key={item.id} className={`agent-activity-item type-${item.type}`}>
              <span className="agent-activity-dot" />
              <div>
                <div className="agent-activity-label">{item.label}</div>
                {item.detail && <div className="agent-activity-detail">{item.detail}</div>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
