import { knowledgeBase } from '../kb/index.js'
import type { InitiationProject } from '../types.js'

export interface SimilarCase {
  id: string
  projectNo?: string
  projectId?: string
  title: string
  snippet: string
  score: number
  outcome?: string
  budget?: string
  projectType?: string
  source: 'kb' | 'archive'
}

function buildSearchQuery(project: InitiationProject): string {
  const parts = [
    project.title,
    project.projectType,
    project.answers.project_type,
    project.answers.target_market,
    project.answers.known_competitors,
    project.answers.project_idea,
    project.budgetRange,
    project.answers.budget_range,
  ]
  return parts.filter(Boolean).join(' ').slice(0, 400)
}

function scoreArchiveProject(current: InitiationProject, other: InitiationProject): number {
  let score = 0
  if (current.projectType && other.projectType === current.projectType) score += 3
  if (current.answers.target_market && other.answers.target_market === current.answers.target_market) {
    score += 4
  }
  if (
    current.answers.known_competitors &&
    other.answers.known_competitors &&
    current.answers.known_competitors.slice(0, 8) === other.answers.known_competitors.slice(0, 8)
  ) {
    score += 2
  }
  const b1 = current.budgetRange || current.answers.budget_range || ''
  const b2 = other.budgetRange || other.answers.budget_range || ''
  if (b1 && b2 && b1 === b2) score += 2
  if (other.status === 'archived') score += 1
  return score
}

export function findSimilarCases(
  project: InitiationProject,
  allProjects: InitiationProject[],
  limit = 5,
): SimilarCase[] {
  const query = buildSearchQuery(project)
  const cases: SimilarCase[] = []
  const seen = new Set<string>()

  const kbHits = knowledgeBase.search(query, { kbTypes: ['reference_case'], limit: 8 })
  for (const hit of kbHits) {
    if (hit.docId === project.id) continue
    const key = hit.docId
    if (seen.has(key)) continue
    seen.add(key)
    cases.push({
      id: hit.docId,
      title: hit.title.replace(/（归档摘要）$/, ''),
      snippet: hit.content.slice(0, 160).replace(/\n+/g, ' '),
      score: hit.score,
      outcome: hit.metadata?.outcome,
      budget: hit.metadata?.budget,
      projectType: hit.metadata?.projectType,
      projectNo: hit.metadata?.projectNo,
      projectId: hit.metadata?.projectId,
      source: 'kb',
    })
  }

  const all = allProjects.filter((p) => p.id !== project.id && p.status === 'archived')
  const ranked = all
    .map((p) => ({ project: p, score: scoreArchiveProject(project, p) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)

  for (const { project: p, score } of ranked) {
    if (seen.has(p.id)) continue
    seen.add(p.id)
    cases.push({
      id: p.id,
      projectId: p.id,
      projectNo: p.projectNo,
      title: p.title,
      snippet: `${p.projectType || '—'} · 预算 ${p.budgetRange || '—'} · ${p.materials.length} 份材料`,
      score: score + 5,
      outcome: p.finalDecision,
      budget: p.budgetRange,
      projectType: p.projectType,
      source: 'archive',
    })
  }

  return cases.sort((a, b) => b.score - a.score).slice(0, limit)
}

export function buildCaseReuseHint(caseItem: SimilarCase): string {
  return `请参考历史立项案例「${caseItem.title}」的写法与论证结构，结合我当前项目情况给出建议。`
}
