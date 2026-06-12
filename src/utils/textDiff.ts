export type DiffRowType = 'same' | 'add' | 'remove' | 'change'

export interface DiffRow {
  type: DiffRowType
  oldLine?: string
  newLine?: string
}

/** 按行对齐的简单 diff，适用于 Markdown 材料版本对比 */
export function diffLinesByIndex(before: string, after: string): DiffRow[] {
  const oldLines = before.split('\n')
  const newLines = after.split('\n')
  const max = Math.max(oldLines.length, newLines.length)
  const rows: DiffRow[] = []

  for (let i = 0; i < max; i++) {
    const o = oldLines[i]
    const n = newLines[i]
    if (o === n) {
      rows.push({ type: 'same', oldLine: o, newLine: n })
    } else if (o === undefined) {
      rows.push({ type: 'add', newLine: n })
    } else if (n === undefined) {
      rows.push({ type: 'remove', oldLine: o })
    } else {
      rows.push({ type: 'change', oldLine: o, newLine: n })
    }
  }
  return rows
}

export function countDiffStats(rows: DiffRow[]) {
  let added = 0
  let removed = 0
  let changed = 0
  for (const r of rows) {
    if (r.type === 'add') added++
    if (r.type === 'remove') removed++
    if (r.type === 'change') changed++
  }
  return { added, removed, changed, total: rows.filter((r) => r.type !== 'same').length }
}
