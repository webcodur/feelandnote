/**
 * dev server 관리: serve(3005) + remotion studio(3002)
 *
 * pnpm dev      → 둘 다 시작
 * pnpm reboot   → 둘 다 죽이고 다시 시작
 * Ctrl+C        → 둘 다 종료
 */
import { execSync, spawn } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const isRestart = process.argv.includes('--restart')

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
  // 자식 프로세스 트리 먼저 kill
  for (const child of [serve, studio].filter(Boolean)) {
    try { execSync(`taskkill /F /T /PID ${child.pid}`, { stdio: 'ignore' }) } catch {}
  }
  killPort(3005)
  killPort(3002)
  process.exit(0)
}

let serve, studio

// Ctrl+C / 종료 시 양쪽 다 정리
process.on('SIGINT', cleanup)
process.on('SIGTERM', cleanup)

if (isRestart) {
  console.log('기존 서버 종료 중...')
  killPort(3005)
  killPort(3002)
  await new Promise(r => setTimeout(r, 1000))
}

// --- serve: 정적 파일 서버 ---
console.log('\n[serve] public → localhost:3005')
serve = spawn('npx', ['serve', 'public', '-p', '3005', '--cors', '-L'], {
  cwd: ROOT,
  stdio: ['ignore', 'pipe', 'pipe'],
  shell: true,
})

// serve 시작 확인 (첫 출력 대기)
let serveReady = false
serve.stdout.on('data', (d) => {
  const msg = d.toString().trim()
  if (!serveReady && msg.includes('Accepting')) {
    serveReady = true
    console.log('  ✓ serve 준비 완료')
  }
})
serve.stderr.on('data', (d) => {
  const msg = d.toString().trim()
  if (msg) console.log(`  [serve 오류] ${msg}`)
})
serve.on('exit', (code) => {
  if (code && code !== 0) console.log(`  [serve] 비정상 종료 (code: ${code})`)
})

// serve 시작 대기 (최대 5초)
await new Promise(resolve => {
  const check = setInterval(() => {
    if (serveReady) { clearInterval(check); resolve() }
  }, 200)
  setTimeout(() => { clearInterval(check); resolve() }, 5000)
})

if (!serveReady) {
  console.log('  ⚠ serve 시작 확인 실패 — 계속 진행')
}

// --- Remotion Studio ---
console.log('[studio] remotion studio → localhost:3002\n')
studio = spawn('npx', ['remotion', 'studio', '--port', '3002'], {
  cwd: ROOT,
  stdio: 'inherit',
  shell: true,
})

studio.on('exit', (code) => {
  console.log(`\nStudio 종료 (code: ${code})`)
  // Studio가 "Already running"으로 즉시 종료된 경우 serve 유지
  if (code === 0 && serve && !serve.killed) {
    console.log('  Studio 이미 실행 중 — serve(3005)만 유지합니다.')
    console.log('  전체 재시작: pnpm reboot')
    // serve 프로세스가 살아있으면 계속 유지
    serve.on('exit', () => process.exit(0))
    return
  }
  killPort(3005)
  process.exit(code)
})
