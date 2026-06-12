import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'fs'
import { join, relative } from 'path'
import { randomUUID } from 'crypto'
import { KB_INDEX_PATH, KB_SEED_DIR, DATA_DIR } from '../config.js'
import type { KbChunk, KbDocument, KbType } from '../types.js'

const KB_SCHEMA_VERSION = 2

const KB_TYPE_MAP: Record<string, KbType> = {
  policy_process: 'policy_process',
  policy_approval: 'policy_approval',
  standard_tech_compliance: 'standard_tech_compliance',
  template_format: 'template_format',
  reference_case: 'reference_case',
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\u4e00-\u9fff\w\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1)
}

function chunkContent(content: string, maxLen = 600): string[] {
  const paragraphs = content.split(/\n\n+/).filter(Boolean)
  const chunks: string[] = []
  let current = ''

  for (const p of paragraphs) {
    if ((current + '\n\n' + p).length > maxLen && current) {
      chunks.push(current.trim())
      current = p
    } else {
      current = current ? `${current}\n\n${p}` : p
    }
  }
  if (current.trim()) chunks.push(current.trim())
  return chunks.length ? chunks : [content]
}

function walkDir(dir: string): string[] {
  const files: string[] = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) files.push(...walkDir(full))
    else if (entry.endsWith('.md')) files.push(full)
  }
  return files
}

export class KnowledgeBase {
  private documents: KbDocument[] = []
  private chunks: KbChunk[] = []

  load() {
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true })

    if (existsSync(KB_INDEX_PATH)) {
      const data = JSON.parse(readFileSync(KB_INDEX_PATH, 'utf-8'))
      if (data.schemaVersion === KB_SCHEMA_VERSION) {
        this.documents = data.documents
        this.chunks = data.chunks.map((c: KbChunk) => ({
          ...c,
          tokens: c.tokens || tokenize(c.content),
        }))
        return
      }
    }

    this.seedFromFiles()
    this.persist()
  }

  seedFromFiles() {
    const files = walkDir(KB_SEED_DIR)
    this.documents = []
    this.chunks = []

    for (const file of files) {
      const rel = relative(KB_SEED_DIR, file)
      const folder = rel.split('/')[0]
      const kbType = KB_TYPE_MAP[folder] || 'organization'
      const content = readFileSync(file, 'utf-8')
      const title = content.match(/^#\s+(.+)/)?.[1] || rel

      const doc: KbDocument = {
        id: randomUUID(),
        title,
        kbType,
        content,
        metadata: { path: rel, folder },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      this.documents.push(doc)

      chunkContent(content).forEach((chunk, i) => {
        this.chunks.push({
          id: randomUUID(),
          docId: doc.id,
          title: `${title} (${i + 1})`,
          kbType,
          content: chunk,
          metadata: { ...doc.metadata, chunkIndex: String(i) },
          tokens: tokenize(chunk),
        })
      })
    }
  }

  persist() {
    writeFileSync(
      KB_INDEX_PATH,
      JSON.stringify({ schemaVersion: KB_SCHEMA_VERSION, documents: this.documents, chunks: this.chunks }, null, 2),
    )
  }

  listDocuments() {
    return this.documents
  }

  getDocument(docId: string): KbDocument | null {
    return this.documents.find((d) => d.id === docId) ?? null
  }

  addDocument(input: { title: string; kbType: KbType; content: string; metadata?: Record<string, string> }) {
    const doc: KbDocument = {
      id: randomUUID(),
      title: input.title,
      kbType: input.kbType,
      content: input.content,
      metadata: input.metadata || {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    this.documents.push(doc)

    chunkContent(input.content).forEach((chunk, i) => {
      this.chunks.push({
        id: randomUUID(),
        docId: doc.id,
        title: `${input.title} (${i + 1})`,
        kbType: input.kbType,
        content: chunk,
        metadata: { ...doc.metadata, chunkIndex: String(i) },
        tokens: tokenize(chunk),
      })
    })

    this.persist()
    return doc
  }

  search(query: string, options?: { kbTypes?: KbType[]; limit?: number }) {
    const queryTokens = tokenize(query)
    const limit = options?.limit ?? 5
    const kbTypes = options?.kbTypes

    const scored = this.chunks
      .filter((c) => !kbTypes || kbTypes.includes(c.kbType))
      .map((chunk) => {
        let score = 0
        for (const qt of queryTokens) {
          if (chunk.content.toLowerCase().includes(qt)) score += 2
          if (chunk.tokens.includes(qt)) score += 1
          if (chunk.title.toLowerCase().includes(qt)) score += 1.5
        }
        return { chunk, score }
      })
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)

    return scored.map(({ chunk, score }) => ({
      chunkId: chunk.id,
      docId: chunk.docId,
      title: chunk.title,
      kbType: chunk.kbType,
      content: chunk.content,
      score,
      metadata: chunk.metadata,
    }))
  }

  getStats() {
    const byType = {} as Record<string, number>
    for (const doc of this.documents) {
      byType[doc.kbType] = (byType[doc.kbType] || 0) + 1
    }
    return {
      documents: this.documents.length,
      chunks: this.chunks.length,
      byType,
    }
  }
}

export const knowledgeBase = new KnowledgeBase()
