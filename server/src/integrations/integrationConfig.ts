import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { DATA_DIR } from '../config.js'

export interface IntegrationConfig {
  jiraBaseUrl: string
  feishuBaseUrl: string
  jiraProjectKey: string
  feishuProjectId: string
  jiraWebhookUrl?: string
  feishuWebhookUrl?: string
  webhookEnabled?: boolean
  updatedAt: string
}

const CONFIG_PATH = `${DATA_DIR}/integration-config.json`

export const DEFAULT_INTEGRATION_CONFIG: IntegrationConfig = {
  jiraBaseUrl: process.env.JIRA_BASE_URL || 'https://jira.example.com',
  feishuBaseUrl: process.env.FEISHU_PROJECT_BASE_URL || 'https://project.feishu.cn',
  jiraProjectKey: process.env.JIRA_PROJECT_KEY || 'INIT',
  feishuProjectId: process.env.FEISHU_PROJECT_ID || 'default',
  jiraWebhookUrl: process.env.JIRA_WEBHOOK_URL || '',
  feishuWebhookUrl: process.env.FEISHU_WEBHOOK_URL || '',
  webhookEnabled: Boolean(process.env.JIRA_WEBHOOK_URL || process.env.FEISHU_WEBHOOK_URL),
  updatedAt: new Date().toISOString(),
}

function ensureDataDir() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true })
}

export function getIntegrationConfig(): IntegrationConfig {
  ensureDataDir()
  if (!existsSync(CONFIG_PATH)) {
    saveIntegrationConfig(DEFAULT_INTEGRATION_CONFIG)
    return DEFAULT_INTEGRATION_CONFIG
  }
  try {
    return { ...DEFAULT_INTEGRATION_CONFIG, ...JSON.parse(readFileSync(CONFIG_PATH, 'utf-8')) }
  } catch {
    return DEFAULT_INTEGRATION_CONFIG
  }
}

export function saveIntegrationConfig(config: Partial<IntegrationConfig>): IntegrationConfig {
  ensureDataDir()
  const next: IntegrationConfig = {
    ...getIntegrationConfig(),
    ...config,
    updatedAt: new Date().toISOString(),
  }
  writeFileSync(CONFIG_PATH, JSON.stringify(next, null, 2), 'utf-8')
  return next
}
