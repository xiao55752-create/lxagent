import { Drawer, Button, Spin, Tag, Space } from 'antd'
import { MessageOutlined, QuestionCircleOutlined } from '@ant-design/icons'
import ReactMarkdown from 'react-markdown'
import type { KbDocument } from '../../api/client'

const KB_TYPE_LABELS: Record<string, string> = {
  policy_process: '立项制度',
  policy_approval: '审批规则',
  standard_tech_compliance: '技术合规',
  template_format: '报告模板',
  reference_case: '历史参考',
}

interface Props {
  document: KbDocument | null
  loading?: boolean
  open: boolean
  onClose: () => void
  highlightExcerpt?: string
  onQuoteToChat?: (text: string) => void
}

function buildQuoteText(document: KbDocument, excerpt?: string) {
  const snippet = excerpt || document.content.slice(0, 280).replace(/\s+/g, ' ').trim()
  return `【引用规则：《${document.title}》】\n${snippet}\n\n请结合当前立项情况分析是否符合要求，并指出需补充的内容。`
}

function buildAskText(document: KbDocument) {
  return `请对照规则标准《${document.title}》，说明当前立项需要满足哪些要点？`
}

export default function KbDocumentDrawer({
  document,
  loading,
  open,
  onClose,
  highlightExcerpt,
  onQuoteToChat,
}: Props) {
  const handleQuote = () => {
    if (!document || !onQuoteToChat) return
    onQuoteToChat(buildQuoteText(document, highlightExcerpt))
    onClose()
  }

  const handleAsk = () => {
    if (!document || !onQuoteToChat) return
    onQuoteToChat(buildAskText(document))
    onClose()
  }

  return (
    <Drawer
      title={document?.title || '知识库文档'}
      open={open}
      onClose={onClose}
      width={560}
      className="kb-doc-drawer"
      footer={
        onQuoteToChat && document ? (
          <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
            <Button icon={<QuestionCircleOutlined />} onClick={handleAsk}>
              询问此规则
            </Button>
            <Button type="primary" icon={<MessageOutlined />} onClick={handleQuote}>
              引用到对话
            </Button>
          </Space>
        ) : null
      }
    >
      {loading ? (
        <div className="kb-doc-drawer-loading">
          <Spin />
        </div>
      ) : document ? (
        <>
          <div className="kb-doc-drawer-meta">
            <Tag>{KB_TYPE_LABELS[document.kbType] || document.kbType}</Tag>
            <time>更新于 {document.updatedAt.slice(0, 10)}</time>
          </div>
          {highlightExcerpt && (
            <div className="kb-doc-drawer-highlight">
              <strong>相关片段</strong>
              <p>{highlightExcerpt}</p>
            </div>
          )}
          <div className="kb-doc-drawer-content markdown-body">
            <ReactMarkdown>{document.content}</ReactMarkdown>
          </div>
        </>
      ) : (
        <p>文档未找到</p>
      )}
    </Drawer>
  )
}
