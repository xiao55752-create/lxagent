import { useMemo, useState } from 'react'
import { Button, Select } from 'antd'
import { diffLinesByIndex, countDiffStats } from '../../utils/textDiff'
import type { Material } from '../../types'

interface Props {
  materials: Material[]
  materialType: string
}

function versionsForType(materials: Material[], type: string) {
  return [...materials]
    .filter((m) => m.materialType === type)
    .sort((a, b) => a.version - b.version)
}

export default function MaterialVersionDiff({ materials, materialType }: Props) {
  const versions = useMemo(() => versionsForType(materials, materialType), [materials, materialType])
  const [compareMode, setCompareMode] = useState(false)
  const [baseVersion, setBaseVersion] = useState<number | null>(null)
  const [targetVersion, setTargetVersion] = useState<number | null>(null)

  if (versions.length < 2) return null

  const latest = versions[versions.length - 1]
  const previous = versions[versions.length - 2]
  const base = versions.find((v) => v.version === (baseVersion ?? previous.version)) ?? previous
  const target = versions.find((v) => v.version === (targetVersion ?? latest.version)) ?? latest

  const rows = diffLinesByIndex(base.content, target.content)
  const stats = countDiffStats(rows)

  const versionOptions = versions.map((v) => ({
    value: v.version,
    label: `v${v.version} · ${MATERIAL_STATUS_LABEL[v.status] || v.status}`,
  }))

  return (
    <div className="material-version-diff">
      <div className="material-version-diff-header">
        <strong>📑 版本历史</strong>
        <span>{versions.length} 个版本</span>
        <Button size="small" type={compareMode ? 'primary' : 'default'} onClick={() => setCompareMode(!compareMode)}>
          {compareMode ? '收起对比' : '对比版本'}
        </Button>
      </div>

      <div className="material-version-pills">
        {versions.map((v) => (
          <span
            key={v.id}
            className={`material-version-pill ${v.id === latest.id ? 'latest' : ''}`}
            title={v.createdAt.slice(0, 16).replace('T', ' ')}
          >
            v{v.version}
          </span>
        ))}
      </div>

      {compareMode && (
        <div className="material-version-compare">
          <div className="material-version-selectors">
            <label>
              基准
              <Select
                size="small"
                value={base.version}
                options={versionOptions}
                onChange={(v) => setBaseVersion(v)}
                style={{ width: 140 }}
              />
            </label>
            <span>→</span>
            <label>
              对比
              <Select
                size="small"
                value={target.version}
                options={versionOptions}
                onChange={(v) => setTargetVersion(v)}
                style={{ width: 140 }}
              />
            </label>
          </div>

          <div className="material-diff-stats">
            {stats.changed > 0 && <span className="diff-stat change">修改 {stats.changed} 行</span>}
            {stats.added > 0 && <span className="diff-stat add">新增 {stats.added} 行</span>}
            {stats.removed > 0 && <span className="diff-stat remove">删除 {stats.removed} 行</span>}
            {stats.total === 0 && <span className="diff-stat same">两版本内容一致</span>}
          </div>

          <div className="material-diff-view">
            {rows.map((row, i) => {
              if (row.type === 'same') {
                return (
                  <div key={i} className="diff-line same">
                    <span className="diff-gutter"> </span>
                    <span className="diff-text">{row.newLine || ' '}</span>
                  </div>
                )
              }
              if (row.type === 'remove') {
                return (
                  <div key={i} className="diff-line remove">
                    <span className="diff-gutter">−</span>
                    <span className="diff-text">{row.oldLine}</span>
                  </div>
                )
              }
              if (row.type === 'add') {
                return (
                  <div key={i} className="diff-line add">
                    <span className="diff-gutter">+</span>
                    <span className="diff-text">{row.newLine}</span>
                  </div>
                )
              }
              return (
                <div key={i} className="diff-line change">
                  <div className="diff-line remove inline">
                    <span className="diff-gutter">−</span>
                    <span className="diff-text">{row.oldLine}</span>
                  </div>
                  <div className="diff-line add inline">
                    <span className="diff-gutter">+</span>
                    <span className="diff-text">{row.newLine}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

const MATERIAL_STATUS_LABEL: Record<string, string> = {
  draft: '草稿',
  confirmed: '已确认',
  locked: '已锁定',
}
