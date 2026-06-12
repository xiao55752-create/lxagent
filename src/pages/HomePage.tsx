import { DatabaseOutlined, RocketOutlined, UnorderedListOutlined } from '@ant-design/icons'
import { Button, message } from 'antd'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { AgentAvatar, FlowPipeline } from '../components/visual/VisualAssets'

const STATS = [
  { value: '7', label: '能力模块' },
  { value: '3', label: '级审批链' },
  { value: '100%', label: '材料可追溯' },
]

const SHOWCASE_MATERIALS = [
  { label: '市场分析', icon: '📊', state: 'done' as const },
  { label: '产品方案', icon: '🎯', state: 'active' as const },
  { label: '资源预算', icon: '💰', state: 'pending' as const },
  { label: '合规预审', icon: '🛡️', state: 'pending' as const },
]

const FEATURES = [
  {
    icon: '💬',
    title: '自然语言对话',
    desc: '像和同事聊天一样描述项目，无需填表',
    color: '#6366f1',
  },
  {
    icon: '🧩',
    title: '独立能力模块',
    desc: '市场、产品、预算等模块可自由切换，不必按顺序推进',
    color: '#8b5cf6',
  },
  {
    icon: '🤖',
    title: '智能体监督台',
    desc: '活动流、执行计划、行动回执与撤销，全程可观测',
    color: '#06b6d4',
  },
  {
    icon: '📁',
    title: '材料实时归档',
    desc: '每份报告即时生成，右侧可视化预览与确认',
    color: '#a855f7',
  },
  {
    icon: '🔗',
    title: '材料溯源',
    desc: '每份材料可追溯到对话片段、采集字段与规则依据',
    color: '#0ea5e9',
  },
  {
    icon: '📚',
    title: '规则标准库',
    desc: '立项制度、审批规则、历史案例随时引用',
    color: '#f59e0b',
  },
]

const SHOWCASE_SCORE = 78
const SHOWCASE_SCORE_R = 15.5
const SHOWCASE_SCORE_C = 2 * Math.PI * SHOWCASE_SCORE_R
const SHOWCASE_SCORE_DASH = (SHOWCASE_SCORE / 100) * SHOWCASE_SCORE_C

const INTELLIGENCE = [
  {
    icon: '📊',
    title: 'Go/No-Go 评分',
    desc: '七维度评估立项可行性，对话后自动刷新',
  },
  {
    icon: '🛡️',
    title: '合规矩阵预审',
    desc: '提交前矩阵校验 + AI 预审报告与风险预测',
  },
  {
    icon: '📈',
    title: '审批效能看板',
    desc: '漏斗、KPI、缺失项 Top，管理视角一目了然',
  },
  {
    icon: '🗂️',
    title: '历史案例复用',
    desc: '归档写入知识库，相似案例匹配并一键参考',
  },
]

export default function HomePage() {
  const navigate = useNavigate()

  const handleStart = async () => {
    try {
      const { project } = await api.createInitiation()
      navigate(`/initiations/${project.id}`)
    } catch {
      message.error('创建立项失败，请确认后端已启动（npm run dev:all）')
    }
  }

  return (
    <div className="home-visual">
      <div className="home-visual-bg" aria-hidden>
        <div className="home-orb home-orb--1" />
        <div className="home-orb home-orb--2" />
        <div className="home-orb home-orb--3" />
      </div>

      <section className="home-visual-hero">
        <div className="home-visual-left">
          <span className="home-badge">AI 驱动的立项体验</span>
          <h1>
            项目立项
            <br />
            <span className="home-gradient-text">智能体平台</span>
          </h1>
          <p>
            告别传统表单与僵化流程。用对话完成立项，左侧能力模块独立切换，
            智能体在后台自动采集、生成材料、合规预审与推进审批。
          </p>
          <div className="home-actions">
            <Button
              type="primary"
              size="large"
              icon={<RocketOutlined />}
              onClick={handleStart}
              className="btn-glow"
            >
              开始立项
            </Button>
            <Button size="large" icon={<UnorderedListOutlined />} onClick={() => navigate('/initiations')}>
              查看项目
            </Button>
            <Button size="large" icon={<DatabaseOutlined />} onClick={() => navigate('/knowledge')}>
              规则库
            </Button>
          </div>

          <div className="home-stats">
            {STATS.map((s) => (
              <div key={s.label} className="home-stat">
                <span className="home-stat-value">{s.value}</span>
                <span className="home-stat-label">{s.label}</span>
              </div>
            ))}
          </div>

          <FlowPipeline activeStep={2} />
        </div>

        <div className="home-visual-right">
          <div className="home-showcase-card">
            <div className="home-showcase-glow" aria-hidden />
            <div className="home-showcase-header">
              <AgentAvatar size={56} />
              <div className="home-showcase-header-text">
                <div className="home-showcase-title-row">
                  <strong>立项智能助手</strong>
                  <span className="home-showcase-live">
                    <span className="home-showcase-live-dot" />
                    执行中
                  </span>
                </div>
                <span>监督台 · 正在执行市场分析模块</span>
              </div>
              <div className="home-showcase-score" title="Go/No-Go 评分">
                <svg viewBox="0 0 36 36" className="home-showcase-score-ring">
                  <circle cx="18" cy="18" r={SHOWCASE_SCORE_R} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
                  <circle
                    cx="18"
                    cy="18"
                    r={SHOWCASE_SCORE_R}
                    fill="none"
                    stroke="#22d3ee"
                    strokeWidth="3"
                    strokeDasharray={`${SHOWCASE_SCORE_DASH} ${SHOWCASE_SCORE_C}`}
                    strokeLinecap="round"
                    transform="rotate(-90 18 18)"
                  />
                </svg>
                <span className="home-showcase-score-num">{SHOWCASE_SCORE}</span>
              </div>
            </div>

            <div className="home-showcase-chat">
              <div className="home-showcase-bubble user">
                产品部-张三，想做制造业 AI 质检 Agent，预算 100-200 万
              </div>
              <div className="home-showcase-bubble agent">
                <span className="home-showcase-typing">●●●</span>
                已提取 6 项字段并生成《市场分析报告》。Go/No-Go 评分 78 分，建议附条件推进 →
              </div>
            </div>

            <div className="home-showcase-materials">
              {SHOWCASE_MATERIALS.map((m) => (
                <div key={m.label} className={`home-showcase-material-chip home-showcase-material-chip--${m.state}`}>
                  {m.icon} {m.label}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="home-features-section">
        <div className="home-section-head">
          <span className="home-section-badge">核心能力</span>
          <h2>为什么选择智能立项</h2>
          <p className="home-section-sub">对话驱动 · 模块独立 · 智能体全程可观测</p>
        </div>
        <div className="home-feature-grid">
          {FEATURES.map((f) => (
            <div key={f.title} className="home-feature-card" style={{ '--accent': f.color } as React.CSSProperties}>
              <div className="home-feature-icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="home-intelligence-section">
        <div className="home-section-head">
          <span className="home-section-badge home-section-badge--light">决策支持</span>
          <h2>智能分析与决策支持</h2>
          <p className="home-intelligence-sub">
            不只是生成文档——从可行性评估到合规预审，再到历史案例复用，让立项决策有依据。
          </p>
        </div>
        <div className="home-intelligence-grid">
          {INTELLIGENCE.map((item) => (
            <div key={item.title} className="home-intelligence-card">
              <span className="home-intelligence-icon">{item.icon}</span>
              <div>
                <h3>{item.title}</h3>
                <p>{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="home-cta-section">
        <div className="home-cta-inner">
          <h2>准备好开始了吗？</h2>
          <p>一键创建立项，智能体即刻引导你完成全流程</p>
          <Button type="primary" size="large" icon={<RocketOutlined />} onClick={handleStart} className="btn-glow">
            立即开始立项
          </Button>
        </div>
      </section>
    </div>
  )
}
