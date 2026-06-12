import express from 'express'
import cors from 'cors'
import { existsSync, mkdirSync } from 'fs'
import { SERVER_PORT, DATA_DIR, INITIATIONS_DIR } from './config.js'
import { knowledgeBase } from './kb/index.js'
import { apiRouter } from './routes/api.js'

if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true })
if (!existsSync(INITIATIONS_DIR)) mkdirSync(INITIATIONS_DIR, { recursive: true })

knowledgeBase.load()

const app = express()
app.use(cors())
app.use(express.json({ limit: '2mb' }))
app.use('/api', apiRouter)

const server = app.listen(SERVER_PORT, () => {
  console.log(`[server] http://localhost:${SERVER_PORT}`)
  console.log(`[server] KB: ${JSON.stringify(knowledgeBase.getStats())}`)
})

server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    console.error(
      `[server] 端口 ${SERVER_PORT} 已被占用。请在项目目录执行：npm run dev:all（会自动释放 5173/8787）`,
    )
    process.exit(1)
  }
  throw err
})
