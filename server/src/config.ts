import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: resolve(__dirname, '../../.env') })

export const SERVER_PORT = Number(process.env.SERVER_PORT || 8787)

export const LLM_CONFIG = {
  apiKey: process.env.LLM_API_KEY || process.env.OPENAI_API_KEY || '',
  baseUrl: process.env.LLM_BASE_URL || process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
  model: process.env.LLM_MODEL || 'gpt-4o-mini',
  embeddingModel: process.env.EMBEDDING_MODEL || 'text-embedding-3-small',
}

export const DATA_DIR = resolve(__dirname, '../data')
export const KB_SEED_DIR = resolve(__dirname, '../kb/seed')
export const KB_INDEX_PATH = resolve(DATA_DIR, 'kb-index.json')
export const PROJECTS_DIR = resolve(DATA_DIR, 'projects')
export const INITIATIONS_DIR = resolve(DATA_DIR, 'initiations')

export function isLlmConfigured() {
  return Boolean(LLM_CONFIG.apiKey)
}
