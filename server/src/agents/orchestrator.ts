import { chatCompletion, formatRagContext, isLlmConfigured } from '../llm/client.js'
import { knowledgeBase } from '../kb/index.js'
import type { InitiationProject } from '../types.js'
import {
  extractFieldsFromText,
  getMissingFields,
  buildFollowUpQuestion,
} from '../workflow/fieldExtract.js'
import { PHASES } from '../workflow/phases.js'
import {
  WORK_MODULES,
  isModuleComplete,
  isModuleReady,
  MODULE_PROMPTS,
} from '../workflow/modules.js'

const EXTRACT_SYSTEM = `你是立项信息提取助手。从用户自然语言中提取结构化字段，只输出 JSON 对象，不要其他文字。
字段名使用英文 key：project_idea, project_name, proposer, project_type, expected_start, duration, pain_point, market_opportunity, target_market, target_customers, known_competitors, differentiation, mvp_features, budget_range 等。
只提取用户明确提到或合理推断的信息，不要编造。可跨模块提取，不限于当前阶段。`

export async function extractWithLlm(
  text: string,
  existing: Record<string, string>,
): Promise<Record<string, string>> {
  if (!isLlmConfigured()) return extractFieldsFromText(text, existing)

  try {
    const userPrompt = `已有信息：${JSON.stringify(existing)}\n用户消息：${text}\n\n从消息中提取所有可识别的立项字段，输出 JSON：`
    const raw = await chatCompletion(EXTRACT_SYSTEM, userPrompt)
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as Record<string, string>
      return { ...existing, ...parsed }
    }
  } catch {
    /* fallback */
  }
  return extractFieldsFromText(text, existing)
}

export async function buildAgentReply(
  project: InitiationProject,
  userMessage: string,
  autoCompletedPhases: string[],
  justGeneratedMaterial?: string,
): Promise<string> {
  if (isLlmConfigured()) {
    try {
      const policyContext = knowledgeBase.search('立项 管理办法 必填', {
        kbTypes: ['policy_process'],
        limit: 2,
      })
      const readyModules = WORK_MODULES.filter(
        (m) => isModuleReady(project, m) && !isModuleComplete(project, m),
      ).map((m) => PHASES.find((p) => p.id === m)?.title || m)

      const system = `你是项目立项智能助手。用自然、专业的中文与用户对话。
- 用户可在同一对话中自由聊任何立项话题，不必按固定顺序
- 左侧能力模块相互独立，引导时说明「可随时补充其他模块信息」
- 引用规则时标注依据`
      const user = `项目：${project.title}（${project.projectNo}）
关注模块：${project.focusPhase ? MODULE_PROMPTS[project.focusPhase] || project.focusPhase : '自由对话'}
刚完成模块：${autoCompletedPhases.map((p) => PHASES.find((x) => x.id === p)?.title || p).join('、') || '无'}
刚生成材料：${justGeneratedMaterial || '无'}
可立即生成的模块：${readyModules.join('、') || '暂无（信息尚不足）'}
用户说：${userMessage}

知识库：${formatRagContext(policyContext)}

请给出简洁友好的回复（150字内），告知进展并自然引导。`
      return await chatCompletion(system, user)
    } catch {
      /* fallback below */
    }
  }

  const parts: string[] = []

  if (autoCompletedPhases.length) {
    parts.push(
      `已完成 ${autoCompletedPhases.map((p) => PHASES.find((x) => x.id === p)?.title || p).join('、')}。`,
    )
  }

  if (justGeneratedMaterial) {
    parts.push(`《${justGeneratedMaterial}》已生成，可在右侧材料区查看。`)
  }

  const focus = project.focusPhase
  if (focus && !isModuleComplete(project, focus)) {
    const missing = getMissingFields(focus, project.answers)
    if (missing.length) {
      parts.push(buildFollowUpQuestion(focus, missing))
    } else if (!hasModuleMaterial(project, focus)) {
      parts.push(`「${PHASES.find((p) => p.id === focus)?.title}」信息已齐，智能体可生成材料。`)
    }
  } else {
    const incomplete = WORK_MODULES.filter((m) => !isModuleComplete(project, m))
    if (incomplete.length) {
      const hints = incomplete
        .slice(0, 3)
        .map((m) => MODULE_PROMPTS[m] || PHASES.find((p) => p.id === m)?.title)
      parts.push(`你还可以随时补充：${hints.join('、')}等。`)
    }
  }

  if (!parts.length) {
    parts.push('收到。继续聊即可，我会从对话中自动整理各模块信息。')
  }

  return parts.join('\n\n')
}

function hasModuleMaterial(project: InitiationProject, phaseId: string): boolean {
  const def = PHASES.find((p) => p.id === phaseId)
  if (!def?.reportKey) return isModuleComplete(project, phaseId as InitiationProject['currentPhase'])
  return project.materials.some((m) => m.materialType === def.reportKey)
}
