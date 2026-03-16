/**
 * Remotion Studio 실행
 *
 * pnpm dev      → Studio 시작
 * pnpm reboot   → 기존 종료 후 재시작
 * Ctrl+C        → 종료
 */
import { execSync, spawn } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const isRestart = process.argv.includes('--restart')

const STUDIO_PORT = process.env.REMOTION_STUDIO_PORT ?? '3002'

function killPort(port) {
  try {
    const out = execSync(`netstat -ano | findstr :${port} | findstr LISTENING`, { encoding: 'utf8' })
    const pids = [...new Set(out.trim().split('\n').map(l => l.trim().split(/\s+/).pop()).filter(Boolean))]
    for (const pid of pids) {
      try {
        execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' })
        console.log(`  포트 ${port} (PID ${pid}) 종료`)
      } catch { /* already dead */ }
    }
  } catch {
    // 해당 포트에 프로세스 없음
  }
}

function cleanup() {
  console.log('\n종료 중...')
  if (studio) {
    try { execSync(`taskkill /F /T /PID ${studio.pid}`, { stdio: 'ignore' }) } catch {}
  }
  killPort(STUDIO_PORT)
  process.exit(0)
}

let studio

process.on('SIGINT', cleanup)
process.on('SIGTERM', cleanup)

if (isRestart) {
  console.log('기존 서버 종료 중...')
  killPort(STUDIO_PORT)
  await new Promise(r => setTimeout(r, 1000))
}

// --- Remotion Studio ---
console.log(`[studio] remotion studio → localhost:${STUDIO_PORT}\n`)
studio = spawn('npx', ['remotion', 'studio', '--port', STUDIO_PORT], {
  cwd: ROOT,
  stdio: 'inherit',
  shell: true,
})

studio.on('exit', (code) => {
  console.log(`\nStudio 종료 (code: ${code})`)
  process.exit(code)
})
