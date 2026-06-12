import { LLM_CONFIG, isLlmConfigured } from '../config.js'
import type { RagResult } from '../types.js'

export async function chatCompletion(system: string, user: string): Promise<string> {
  if (!isLlmConfigured()) {
    throw new Error('LLM_NOT_CONFIGURED')
  }

  const res = await fetch(`${LLM_CONFIG.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${LLM_CONFIG.apiKey}`,
    },
    body: JSON.stringify({
      model: LLM_CONFIG.model,
      temperature: 0.4,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`LLM_ERROR: ${res.status} ${err}`)
  }

  const data = (await res.json()) as {
    choices: Array<{ message: { content: string } }>
  }
  return data.choices[0]?.message?.content || ''
}

export function formatRagContext(sources: RagResult[]): string {
  if (!sources.length) return '（知识库未检索到相关内容）'
  return sources
    .map(
      (s, i) =>
        `[${i + 1}] 标题：${s.title}\n类型：${s.kbType}\n内容：${s.content}\n相关度：${s.score.toFixed(2)}`,
    )
    .join('\n\n')
}

export { isLlmConfigured }
