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
import http from 'http'
import fs from 'fs'

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

// --- Studio API 서버 (voiceTimings sub 편집 저장용) ---

const API_PORT = 8787

/** 에피소드 디렉토리 탐색.
 *  신구조: public/episodes/.../<person>/ (_status 파일 보유, 그룹 폴더 안 가능)
 *  옛 구조 폴백: public/episodes/<status>/<person>/ */
function findEpisodeDir(person) {
  const episodesRoot = path.join(ROOT, 'public', 'episodes')
  const STATUSES = ['todo', 'live', 'done']
  function walk(dir, depth) {
    let entries
    try { entries = fs.readdirSync(dir, { withFileTypes: true }) } catch { return null }
    for (const e of entries) {
      if (!e.isDirectory()) continue
      if (e.name.startsWith('_')) continue
      if (depth === 0 && (STATUSES.includes(e.name) || e.name === 'pre-todo')) continue
      const sub = path.join(dir, e.name)
      if (fs.existsSync(path.join(sub, '_status.json'))) {
        if (e.name === person) return sub
        continue
      }
      const found = walk(sub, depth + 1)
      if (found) return found
    }
    return null
  }
  const hit = walk(episodesRoot, 0)
  if (hit) return hit
  for (const status of STATUSES) {
    const dir = path.join(episodesRoot, status, person)
    if (fs.existsSync(dir)) return dir
  }
  throw new Error(`Episode not found: ${person}`)
}

const apiServer = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return }

  if (req.method === 'POST' && req.url === '/api/save-sub') {
    let body = ''
    req.on('data', c => { body += c })
    req.on('end', () => {
      try {
        const { episode, locale, timingKey, segIndex, sub } = JSON.parse(body)
        if (!episode || !locale || !timingKey || segIndex == null || !Array.isArray(sub)) {
          res.writeHead(400); res.end(JSON.stringify({ error: 'missing fields' })); return
        }
        // episode 식별자 → 디렉터리명: 모든 locale 접미사 제거 (예: zhuge-liang-ko → zhuge-liang).
        const dir = episode.replace(new RegExp(`-${locale}$`), '')
        const epDir = findEpisodeDir(dir)
        // 신구조 우선: meta.{locale}.timing.json. 없으면 레거시 폴백: {locale}.timing.json → {locale}.json.
        const candidates = [
          path.join(epDir, `meta.${locale}.timing.json`),
          path.join(epDir, `${locale}.timing.json`),
          path.join(epDir, `${locale}.json`),
        ]
        const jsonPath = candidates.find(p => fs.existsSync(p))
        if (!jsonPath) {
          res.writeHead(404); res.end(JSON.stringify({ error: 'file not found', tried: candidates })); return
        }
        const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'))
        if (!data.voiceTimings?.[timingKey]?.[segIndex]) {
          res.writeHead(404); res.end(JSON.stringify({ error: `timing segment not found: ${timingKey}[${segIndex}]` })); return
        }
        data.voiceTimings[timingKey][segIndex].sub = sub
        // 기존 subTimings는 sub 길이가 바뀐 순간 의미가 어긋나므로 제거 — voice:align 재실행으로 자동 산출.
        delete data.voiceTimings[timingKey][segIndex].subTimings
        fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2) + '\n', 'utf8')
        console.log(`[api] sub 저장: ${jsonPath} → ${timingKey}[${segIndex}]`)
        res.writeHead(200); res.end(JSON.stringify({ ok: true }))
      } catch (e) {
        console.error('[api] save-sub 실패:', e)
        res.writeHead(500); res.end(JSON.stringify({ error: String(e) }))
      }
    })
    return
  }
  res.writeHead(404); res.end('not found')
})
apiServer.listen(API_PORT, () => console.log(`[api] sub 편집 API → localhost:${API_PORT}\n`))

// --- Remotion Studio ---
console.log(`[studio] remotion studio → localhost:${STUDIO_PORT}\n`)
studio = spawn('npx', ['remotion', 'studio', '--port', STUDIO_PORT], {
  cwd: ROOT,
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, NODE_OPTIONS: '--max-old-space-size=4096' },
})

studio.on('exit', (code) => {
  console.log(`\nStudio 종료 (code: ${code})`)
  process.exit(code)
})
