// Google 일일 색인 신청 — Aside u0 프로필(webcodur@gmail.com, sc-domain 권한)로 할당량이 찰 때까지 순서대로 요청한다.
// Usage (from sw/remotion so googleapis resolves):
//   node scripts/_scratch-gsc-aside-queue.mjs [우선 경로 ...]      예: celeb/bill-gates en/celeb/bill-gates
// 1) 우선 경로 + 조사 데이터 최신 항목의 nextQueue를 URL Inspection API로 먼저 검사해, 이미 색인된 큐 항목은 건너뛴다.
//    우선 경로는 색인됨이어도 요청한다(새 배포본 재수집용).
// 2) URL 하나당 aside repl 한 호출로 검사→요청→결과 확인을 끝낸다. URL당 한 번만 누르고 「오류 발생」도 재시도하지 않는다.
// 3) 「할당량 초과」나 결과 미확인(PENDING)이면 즉시 멈추고, 오늘 항목을 조사 데이터 dailyIndexingRequests에 붙인다.
// 절차·판정 규칙은 docs/continuous/google-indexing.md가 쥔다.
import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { google } from 'googleapis'

const here = path.dirname(fileURLToPath(import.meta.url))
const repo = path.resolve(here, '..', '..', '..')
const dataFile = path.join(repo, 'data', 'seo-index-inspection-20260909.json')
const requestCode = fs.readFileSync(path.join(here, '_scratch-gsc-aside-request.js'), 'utf8')
const ASIDE = 'C:\\Users\\webco\\AppData\\Local\\Aside\\CLI\\current\\aside.exe'
const ACCOUNT = 'u0'
const BASE = 'https://feelandnote.com/'
const full = (p) => (p.startsWith('http') ? p : BASE + p.replace(/^\//, ''))
const short = (u) => u.replace(BASE, '')
const today = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10) // KST

const raw = fs.readFileSync(dataFile, 'utf8')
const data = JSON.parse(raw)
const days = data.dailyIndexingRequests
// GSC_QUEUE_CONTINUE=1이면 PENDING 등으로 일찍 멈춘 날을 이어 돌린다 — 오늘 이미 누른 URL은 빼고 오늘 항목에 병합한다
const isContinuation = days.some((d) => d.date === today)
if (isContinuation && !process.env.GSC_QUEUE_CONTINUE) throw new Error(`조사 데이터에 ${today} 항목이 이미 있다 — 같은 날 두 번 돌리지 않는다`)
const prev = days[days.length - 1]
const attemptedToday = new Set(isContinuation
  ? [...(prev.accepted ?? []).map((a) => a.url), ...(prev.errors ?? []).map((e) => e.url), ...(prev.stopped ?? []), ...(prev.limit ? [prev.limit.url] : [])].map(short)
  : [])
const priority = process.argv.slice(2).map(full).filter((u) => !attemptedToday.has(short(u)))
const all = [...new Set([...priority, ...(prev.nextQueue ?? []).map(full).filter((u) => !attemptedToday.has(short(u)))])]

// API 사전 검사 — 호출마다 시간 제한(제한 없는 호출 하나가 큐 전체를 멈춘 적이 있다)
const auth = new google.auth.GoogleAuth({ keyFile: path.join(repo, 'credentials', 'ga-service-account.json'), scopes: ['https://www.googleapis.com/auth/webmasters.readonly'] })
const sc = google.searchconsole({ version: 'v1', auth })
const api = {}
let cursor = 0
await Promise.all(Array.from({ length: 5 }, async () => {
  while (cursor < all.length) {
    const url = all[cursor++]
    try {
      const res = await sc.urlInspection.index.inspect({ requestBody: { inspectionUrl: url, siteUrl: 'sc-domain:feelandnote.com', languageCode: 'ko' } }, { timeout: 20000 })
      const r = res.data.inspectionResult?.indexStatusResult ?? {}
      api[url] = { verdict: r.verdict ?? null, coverageState: r.coverageState ?? null, lastCrawlTime: r.lastCrawlTime ?? null }
    } catch (e) {
      api[url] = { error: String(e?.message ?? e).slice(0, 120) }
    }
  }
}))
const targets = all.filter((u) => priority.includes(u) || api[u]?.verdict !== 'PASS')
const skipped = all.filter((u) => !targets.includes(u))
console.log(`api checked ${all.length}, targets ${targets.length}, skipped(indexed) ${skipped.length}`)

function requestOne(url) {
  return new Promise((resolve) => {
    const child = spawn(ASIDE, ['repl', '--account', ACCOUNT, `const ARGS = ${JSON.stringify([url])};\n${requestCode}`], { windowsHide: true })
    let out = ''
    child.stdout.on('data', (d) => { out += d })
    child.stderr.on('data', (d) => { out += d })
    const timer = setTimeout(() => child.kill(), 150000)
    child.on('close', () => {
      clearTimeout(timer)
      const line = out.split('\n').find((l) => l.startsWith('{"target"'))
      try { resolve(line ? JSON.parse(line) : { target: url, status: 'NO_OUTPUT', raw: out.slice(-300) }) }
      catch { resolve({ target: url, status: 'NO_OUTPUT', raw: out.slice(-300) }) }
    })
  })
}

const results = []
let stop = null
for (const url of targets) {
  const r = await requestOne(url)
  results.push({ url, api: api[url] ?? null, ...r })
  console.log(`${results.length}/${targets.length} ${r.status} ${short(url)}`)
  if (/할당량 초과/.test(r.status) || r.status === 'PENDING') { stop = results[results.length - 1]; break }
}

const src = `Search Console UI (Aside ${ACCOUNT}, sc-domain)`
const accepted = results.filter((r) => r.status === '색인 생성 요청됨').map((r) => ({ url: r.url, status: 'request accepted', source: src, attempts: 1, dialogTitle: r.status, api: r.api }))
const errors = results.filter((r) => r.status !== '색인 생성 요청됨' && r !== stop).map((r) => ({ url: r.url, status: r.status, source: src, attempts: 1 }))
const done = new Set(results.map((r) => short(r.url)))
const nextQueue = [
  ...(stop ? [short(stop.url)] : []),
  ...errors.filter((e) => e.status === '오류 발생').map((e) => short(e.url)),
  ...(prev.nextQueue ?? []).map((p) => short(full(p))).filter((p) => !done.has(p)),
]
if (isContinuation) {
  prev.priority = [...new Set([...(prev.priority ?? []), ...priority.map(short)])]
  prev.skippedAlreadyIndexed = [...new Set([...(prev.skippedAlreadyIndexed ?? []), ...skipped.map(short)])]
  prev.accepted.push(...accepted)
  prev.acceptedCount = prev.accepted.length
  prev.errors.push(...errors)
  prev.stopped = [...new Set([...(prev.stopped ?? []), ...(stop ? [stop.url] : [])])]
  prev.limit = stop ? { url: stop.url, status: stop.status, note: stop.text ?? '', attempts: (prev.limit?.attempts ?? 0) + 1 } : prev.limit
  prev.nextQueue = nextQueue
} else {
  days.push({
    date: today,
    property: 'sc-domain:feelandnote.com',
    propertyNote: `aside repl --account ${ACCOUNT} (webcodur@gmail.com), _scratch-gsc-aside-queue.mjs`,
    priority: priority.map(short),
    skippedAlreadyIndexed: skipped.map(short),
    acceptedCount: accepted.length,
    accepted,
    errors,
    limit: stop ? { url: stop.url, status: stop.status, note: stop.text ?? '', attempts: 1 } : null,
    nextQueue,
  })
}
fs.writeFileSync(dataFile, JSON.stringify(data, null, 1) + (raw.endsWith('\n') ? '\n' : ''), 'utf8')
console.log(`accepted ${accepted.length}, errors ${errors.length}, stop ${stop ? `${stop.status} ${short(stop.url)}` : 'none'}, nextQueue ${nextQueue.length}`)
