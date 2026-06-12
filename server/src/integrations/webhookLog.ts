import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { DATA_DIR } from '../config.js'

export interface WebhookLogEntry {
  id: string
  projectId: string
  projectNo: string
  projectTitle: string
  target: 'jira' | 'feishu'
  externalId: string
  url: string
  summary: string
  webhookSent: boolean
  webhookError?: string
  pushedAt: string
}

const LOG_PATH = `${DATA_DIR}/webhook-log.json`
const MAX_ENTRIES = 100

function ensureDataDir() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true })
}

function readLog(): WebhookLogEntry[] {
  ensureDataDir()
  if (!existsSync(LOG_PATH)) return []
  try {
    const data = JSON.parse(readFileSync(LOG_PATH, 'utf-8'))
    return Array.isArray(data.entries) ? data.entries : []
  } catch {
    return []
  }
}

export function appendWebhookLog(entry: Omit<WebhookLogEntry, 'id' | 'pushedAt'> & { pushedAt?: string }) {
  const entries = readLog()
  const next: WebhookLogEntry = {
    ...entry,
    id: `wh_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    pushedAt: entry.pushedAt || new Date().toISOString(),
  }
  entries.unshift(next)
  writeFileSync(LOG_PATH, JSON.stringify({ entries: entries.slice(0, MAX_ENTRIES) }, null, 2), 'utf-8')
  return next
}

export function listWebhookLogs(limit = 30): WebhookLogEntry[] {
  return readLog().slice(0, limit)
}
