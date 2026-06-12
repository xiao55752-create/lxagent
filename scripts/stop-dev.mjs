/**
 * 释放固定开发端口（5173 / 8787），等待端口真正空闲后再退出。
 */
import { execSync } from 'node:child_process'
import { setTimeout as sleep } from 'node:timers/promises'

const PORTS = [5173, 8787]
const MAX_WAIT_MS = 5000

function pidsOnPort(port) {
  try {
    return execSync(`lsof -ti:${port}`, { encoding: 'utf8' })
      .trim()
      .split('\n')
      .filter(Boolean)
  } catch {
    return []
  }
}

function killPort(port) {
  for (const pid of pidsOnPort(port)) {
    try {
      process.kill(Number(pid), 'SIGKILL')
      console.log(`[stop-dev] 已停止端口 ${port} 上的进程 ${pid}`)
    } catch {
      /* 进程可能已退出 */
    }
  }
}

for (const port of PORTS) killPort(port)

const deadline = Date.now() + MAX_WAIT_MS
while (Date.now() < deadline) {
  const busy = PORTS.filter((p) => pidsOnPort(p).length > 0)
  if (busy.length === 0) break
  await sleep(200)
  for (const port of busy) killPort(port)
}

const stillBusy = PORTS.filter((p) => pidsOnPort(p).length > 0)
if (stillBusy.length) {
  console.warn(
    `[stop-dev] 端口仍被占用: ${stillBusy.join(', ')}（若已在运行 dev，可忽略；或先 Ctrl+C 停掉旧进程）`,
  )
}
