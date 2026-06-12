import { useMemo } from 'react'
import { Button, Tag } from 'antd'
import { LockOutlined, CheckOutlined } from '@ant-design/icons'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useInitiationStore } from '../store/useInitiationStore'
import type { Material } from '../types'
import { EmptyMaterialsIllustration, MaterialCover, materialTheme } from './visual/VisualAssets'
import MaterialTracePanel from './agent/MaterialTracePanel'
import MaterialVersionDiff from './agent/MaterialVersionDiff'

const MATERIAL_STATUS: Record<string, { label: string; color: string }> = {
  draft: { label: '草稿', color: 'default' },
  confirmed: { label: '已确认', color: 'success' },
  locked: { label: '已锁定', color: 'purple' },
}

function latestByType(materials: Material[], type: string) {
  return [...materials]
    .filter((m) => m.materialType === type)
    .sort((a, b) => b.version - a.version)[0]
}

export default function ReportPanel() {
  const { project, activeMaterialKey, setActiveMaterial, confirmMaterial, setHighlightMessageId } =
    useInitiationStore()

  const tabs = useMemo(() => {
    if (!project) return []
    const types = new Set(project.materials.map((m) => m.materialType))
    return [...types].map((type) => {
      const m = latestByType(project.materials, type)
      return { key: type, label: m?.title || type, material: m }
    })
  }, [project])

  const activeKey = activeMaterialKey && tabs.find((t) => t.key === activeMaterialKey)
    ? activeMaterialKey
    : tabs[0]?.key

  const activeMaterial = tabs.find((t) => t.key === activeKey)?.material

  if (!project) return null

  if (tabs.length === 0) {
    return (
      <div className="report-panel visual-report">
        <div className="report-panel-header">
          <h3>📁 材料归档</h3>
        </div>
        <div className="report-empty visual-empty">
          <EmptyMaterialsIllustration />
          <h4>材料将在这里出现</h4>
          <p>与助手对话后，智能体生成的报告会实时归档到此面板</p>
        </div>
      </div>
    )
  }

  const canConfirm =
    activeMaterial?.status === 'draft' &&
    !['pending_l1', 'pending_l2', 'pending_l3', 'archived'].includes(project.status)

  return (
    <div className="report-panel visual-report">
      <div className="report-panel-header">
        <h3>📁 材料归档</h3>
        <span className="report-count">{project.materials.length} 份</span>
      </div>

      <div className="material-card-grid">
        {tabs.map((tab) => {
          const theme = materialTheme(tab.key)
          const isActive = activeKey === tab.key
          return (
            <button
              key={tab.key}
              type="button"
              className={`material-card ${isActive ? 'active' : ''}`}
              onClick={() => setActiveMaterial(tab.key)}
            >
              <div className="material-card-cover" style={{ background: theme.gradient }}>
                <span className="material-card-emoji">{theme.emoji}</span>
              </div>
              <div className="material-card-info">
                <span className="material-card-title">{tab.label}</span>
                {tab.material && (
                  <Tag color={MATERIAL_STATUS[tab.material.status]?.color} className="material-card-tag">
                    {MATERIAL_STATUS[tab.material.status]?.label}
                  </Tag>
                )}
              </div>
            </button>
          )
        })}
      </div>

      {activeMaterial && (
        <>
          <MaterialCover type={activeKey!} title={activeMaterial.title} />
          <div className="material-meta">
            <Tag>v{activeMaterial.version}</Tag>
            {activeMaterial.status === 'locked' && (
              <Tag icon={<LockOutlined />} color="purple">
                审批锁定
              </Tag>
            )}
            {activeMaterial.confirmedAt && (
              <span className="material-meta-time">
                确认于 {activeMaterial.confirmedAt.slice(0, 16).replace('T', ' ')}
              </span>
            )}
          </div>
        </>
      )}

      {activeMaterial && (
        <MaterialVersionDiff materials={project.materials} materialType={activeKey!} />
      )}

      <div className="report-content">
        {activeMaterial && <ReactMarkdown remarkPlugins={[remarkGfm]}>{activeMaterial.content}</ReactMarkdown>}
      </div>

      {activeMaterial && (
        <MaterialTracePanel
          project={project}
          material={activeMaterial}
          onJumpToMessage={(id) => setHighlightMessageId(id)}
        />
      )}

      {canConfirm && activeKey && (
        <div className="material-actions">
          <Button
            type="primary"
            block
            icon={<CheckOutlined />}
            onClick={() => confirmMaterial(activeKey)}
            className="btn-glow"
          >
            确认材料并纳入归档
          </Button>
        </div>
      )}
    </div>
  )
}
