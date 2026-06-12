import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Button, Form, Input, Select, message } from 'antd'
import { PlusOutlined, SearchOutlined } from '@ant-design/icons'
import { api, type KbDocument, type RagResult } from '../api/client'
import KbDocumentDrawer from '../components/knowledge/KbDocumentDrawer'
import PageShell from '../components/layout/PageShell'
import PageHero from '../components/layout/PageHero'
import LoadingState from '../components/layout/LoadingState'

const KB_CATEGORIES = [
  {
    type: 'policy_process',
    label: '立项制度',
    icon: '📋',
    desc: '流程规范与管理办法',
    gradient: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
  },
  {
    type: 'policy_approval',
    label: '审批规则',
    icon: '✅',
    desc: '三级审批关注点',
    gradient: 'linear-gradient(135deg, #f59e0b, #f97316)',
  },
  {
    type: 'standard_tech_compliance',
    label: '技术合规',
    icon: '🔧',
    desc: '技术标准与合规要求',
    gradient: 'linear-gradient(135deg, #3b82f6, #6366f1)',
  },
  {
    type: 'template_format',
    label: '报告模板',
    icon: '📝',
    desc: '材料格式与模板',
    gradient: 'linear-gradient(135deg, #a855f7, #ec4899)',
  },
  {
    type: 'reference_case',
    label: '历史参考',
    icon: '📦',
    desc: '归档案例与摘要',
    gradient: 'linear-gradient(135deg, #14b8a6, #06b6d4)',
  },
]

const KB_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  KB_CATEGORIES.map((c) => [c.type, c.label]),
)

export default function KnowledgeBasePage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [documents, setDocuments] = useState<KbDocument[]>([])
  const [stats, setStats] = useState<{ documents: number; chunks: number; byType: Record<string, number> }>()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<RagResult[]>([])
  const [activeType, setActiveType] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [form] = Form.useForm()
  const [drawerDoc, setDrawerDoc] = useState<KbDocument | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerLoading, setDrawerLoading] = useState(false)
  const [highlightExcerpt, setHighlightExcerpt] = useState<string | undefined>()

  const load = async () => {
    setLoading(true)
    try {
      const data = await api.listKbDocuments()
      setDocuments(data.documents)
      setStats(data.stats)
    } catch {
      message.error('无法连接知识库服务，请启动后端')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const openDocument = async (docId: string, excerpt?: string) => {
    const cached = documents.find((d) => d.id === docId)
    setHighlightExcerpt(excerpt)
    setDrawerOpen(true)
    if (cached) {
      setDrawerDoc(cached)
      return
    }
    setDrawerLoading(true)
    try {
      const { document } = await api.getKbDocument(docId)
      setDrawerDoc(document)
    } catch {
      message.error('无法加载文档')
      setDrawerOpen(false)
    } finally {
      setDrawerLoading(false)
    }
  }

  useEffect(() => {
    const docId = searchParams.get('doc')
    if (!docId) return
    const excerpt = searchParams.get('excerpt') || undefined
    openDocument(docId, excerpt)
  }, [searchParams, documents.length])

  const closeDrawer = () => {
    setDrawerOpen(false)
    setHighlightExcerpt(undefined)
    if (searchParams.get('doc')) {
      const next = new URLSearchParams(searchParams)
      next.delete('doc')
      next.delete('excerpt')
      setSearchParams(next, { replace: true })
    }
  }

  const fromProjectId = searchParams.get('from')

  const handleQuoteToWorkspace = (text: string) => {
    if (!fromProjectId) {
      message.info('请从立项工作台打开规则后再引用到对话')
      return
    }
    navigate(`/initiations/${fromProjectId}`, { state: { quote: text } })
  }

  const handleDocClick = (doc: KbDocument) => {
    const params: Record<string, string> = { doc: doc.id }
    if (fromProjectId) params.from = fromProjectId
    setSearchParams(params, { replace: true })
  }

  const handleSearch = async () => {
    if (!searchQuery.trim()) return
    try {
      const { results } = await api.searchKb(searchQuery)
      setSearchResults(results)
    } catch {
      message.error('检索失败')
    }
  }

  const handleAdd = async (values: { title: string; kbType: string; content: string }) => {
    try {
      await api.addKbDocument(values)
      message.success('文档已入库')
      form.resetFields()
      setShowAdd(false)
      load()
    } catch {
      message.error('入库失败')
    }
  }

  const filtered = activeType ? documents.filter((d) => d.kbType === activeType) : documents

  return (
    <PageShell wide className="kb-visual-page">
      <PageHero
        badge="📚 规则标准库"
        title="智能体知识底座"
        description="立项制度、审批规则、技术合规、报告模板与历史案例 — 智能体生成材料时自动引用"
        actions={
          stats ? (
            <div className="kb-stats-row">
              <div className="kb-stat-pill">
                <strong>{stats.documents}</strong> 文档
              </div>
              <div className="kb-stat-pill">
                <strong>{stats.chunks}</strong> 知识切片
              </div>
            </div>
          ) : undefined
        }
      />

      <div className="kb-category-grid">
        {KB_CATEGORIES.map((cat) => (
          <button
            key={cat.type}
            type="button"
            className={`kb-category-card ${activeType === cat.type ? 'active' : ''}`}
            onClick={() => setActiveType(activeType === cat.type ? null : cat.type)}
          >
            <div className="kb-category-cover" style={{ background: cat.gradient }}>
              <span>{cat.icon}</span>
            </div>
            <div className="kb-category-info">
              <strong>{cat.label}</strong>
              <span>{cat.desc}</span>
              <em>{stats?.byType[cat.type] || 0} 篇</em>
            </div>
          </button>
        ))}
      </div>

      <div className="kb-search-hero">
        <Input
          size="large"
          placeholder="语义检索：如「单个项目预算上限」「制造业 AI 合规要求」"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onPressEnter={handleSearch}
          prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
          className="kb-search-input"
        />
        <Button type="primary" size="large" icon={<SearchOutlined />} onClick={handleSearch} className="btn-glow">
          检索
        </Button>
      </div>

      {searchResults.length > 0 && (
        <div className="kb-search-results">
          <h3>检索结果</h3>
          {searchResults.map((r) => (
            <div key={r.chunkId} className="kb-result-card">
              <div className="kb-result-head">
                <span className="kb-result-tag">{KB_TYPE_LABELS[r.kbType] || r.kbType}</span>
                <strong>{r.title}</strong>
                <span className="kb-result-score">相关度 {r.score.toFixed(1)}</span>
              </div>
              <p>{r.content}</p>
            </div>
          ))}
        </div>
      )}

      <div className="kb-docs-section">
        <div className="kb-docs-header">
          <h3>{activeType ? KB_TYPE_LABELS[activeType] : '全部文档'}</h3>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowAdd(!showAdd)}>
            添加入库
          </Button>
        </div>

        {showAdd && (
          <div className="kb-add-form">
            <Form form={form} layout="vertical" onFinish={handleAdd}>
              <Form.Item name="title" label="标题" rules={[{ required: true }]}>
                <Input placeholder="如：2026 Q1 竞品动态" />
              </Form.Item>
              <Form.Item name="kbType" label="类型" rules={[{ required: true }]}>
                <Select
                  options={KB_CATEGORIES.map((c) => ({ label: c.label, value: c.type }))}
                  placeholder="选择知识库类型"
                />
              </Form.Item>
              <Form.Item name="content" label="内容" rules={[{ required: true }]}>
                <Input.TextArea rows={6} placeholder="支持 Markdown 格式..." />
              </Form.Item>
              <Button type="primary" htmlType="submit" icon={<PlusOutlined />}>
                入库
              </Button>
            </Form>
          </div>
        )}

        {loading ? (
          <LoadingState tip="加载知识库..." minHeight="24vh" />
        ) : (
          <div className="kb-doc-grid">
            {filtered.map((doc) => {
              const cat = KB_CATEGORIES.find((c) => c.type === doc.kbType)
              return (
                <article
                  key={doc.id}
                  className={`kb-doc-card ${searchParams.get('doc') === doc.id ? 'highlighted' : ''}`}
                  onClick={() => handleDocClick(doc)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && handleDocClick(doc)}
                >
                  <div className="kb-doc-cover" style={{ background: cat?.gradient || '#64748b' }}>
                    {cat?.icon || '📄'}
                  </div>
                  <div className="kb-doc-body">
                    <span className="kb-doc-type">{KB_TYPE_LABELS[doc.kbType] || doc.kbType}</span>
                    <h4>{doc.title}</h4>
                    <p>{doc.content.slice(0, 80)}…</p>
                    {doc.kbType === 'reference_case' && doc.metadata?.projectId && (
                      <Button
                        type="link"
                        size="small"
                        className="kb-doc-link"
                        onClick={(e) => {
                          e.stopPropagation()
                          navigate(`/initiations/${doc.metadata!.projectId}`)
                        }}
                      >
                        打开原立项
                      </Button>
                    )}
                    <time>{doc.updatedAt.slice(0, 10)}</time>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </div>

      <KbDocumentDrawer
        document={drawerDoc}
        loading={drawerLoading}
        open={drawerOpen}
        onClose={closeDrawer}
        highlightExcerpt={highlightExcerpt}
        onQuoteToChat={fromProjectId ? handleQuoteToWorkspace : undefined}
      />
    </PageShell>
  )
}
