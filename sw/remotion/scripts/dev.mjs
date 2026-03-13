/**
 * dev server 관리: serve(3005) + remotion studio(3001)
 *
 * pnpm dev          → 둘 다 시작
 * pnpm restart      → 둘 다 죽이고 다시 시작
 */
import { execSync, spawn } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const isRestart = process.argv.includes('--restart')

function killPort(port) {
  try {
    // Windows: netstat로 PID 찾아서 kill
    const out = execSync(`netstat -ano | findstr :${port} | findstr LISTENING`, { encoding: 'utf8' })
    const pids = [...new Set(out.trim().split('\n').map(l => l.trim().split(/\s+/).pop()).filter(Boolean))]
    for (const pid of pids) {
      try {
        execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' })
        console.log(`포트 ${port} (PID ${pid}) 종료`)
      } catch { /* already dead */ }
    }
  } catch {
    // 해당 포트에 프로세스 없음
  }
}

if (isRestart) {
  console.log('기존 서버 종료 중...')
  killPort(3005)
  killPort(3001)
  // 약간 대기
  await new Promise(r => setTimeout(r, 1000))
}

console.log('\n[serve] public → localhost:3005')
const serve = spawn('npx', ['serve', 'public', '-p', '3005', '--cors'], {
  cwd: ROOT,
  stdio: 'ignore',
  shell: true,
  detached: true,
})
serve.unref()

console.log('[studio] remotion studio → localhost:3001')
const studio = spawn('npx', ['remotion', 'studio'], {
  cwd: ROOT,
  stdio: 'inherit',
  shell: true,
})

studio.on('exit', (code) => {
  console.log(`Studio 종료 (code: ${code})`)
  killPort(3005)
  process.exit(code)
})
