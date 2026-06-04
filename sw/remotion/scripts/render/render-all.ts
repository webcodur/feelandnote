/**
 * render-all.ts — 롱폼 + 쇼츠 + 솔로(1권 모드) MP4/SRT 일괄 렌더
 *
 * Usage:
 *   pnpm render:all                                       # 전체 에피소드
 *   pnpm render:all -- --episode alexander-the-great      # 특정 에피소드 (한/영 모두)
 *   pnpm render:all -- --only longform                    # 롱폼만
 *   pnpm render:all -- --only shorts                      # 쇼츠만
 *   pnpm render:all -- --only solos                       # 솔로(1권 모드)만
 *   pnpm render:all -- --lang ko                          # 한국어만
 *   pnpm render:all -- --lang en                          # 영문만
 *   pnpm render:all -- --episode alex-karp --lang ko --only shorts  # 조합 가능
 *   pnpm render:all -- --episode elon-musk --only solos --book-index 0  # 솔로 특정 책만
 */
import { execSync, spawn } from 'child_process'
import { writeFileSync, mkdirSync, readdirSync, readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { buildLongformSubs, buildShortsSubs, subsToSrt } from '../srt/srt-builder'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

import type { BookRecommendScript, EpisodeTimingData } from '../../src/compositions/BookRecommend/types'

// --- 에피소드 로드 (파일시스템 직접 탐색) ---
const EPISODES_DIR = join(__dirname, '..', '..', 'public', 'episodes')
const STATUSES = ['done', 'live', 'todo'] as const

/** episodes/ 재귀 스캔하여 _status.json 보유 인물 폴더 수집.
 *  옛 구조(<status>/<person>) 폴백도 지원. */
function scanPersonFolders(root: string): Array<{ name: string; dir: string }> {
  const INACTIVE = new Set(['excluded', 'pre-todo', 'todo-easy', 'todo-normal', 'todo-hard'])
  const hits: Array<{ name: string; dir: string }> = []
  function walk(dir: string, depth: number) {
    let entries
    try { entries = readdirSync(dir, { withFileTypes: true }) } catch { return }
    for (const e of entries) {
      if (!e.isDirectory() || e.name.startsWith('_')) continue
      if (depth === 0 && INACTIVE.has(e.name)) continue
      // 옛 status 폴더는 한 단계 더 들어가서 person 폴더 찾기
      if (depth === 0 && (STATUSES as readonly string[]).includes(e.name)) {
        walk(join(dir, e.name), depth + 1)
        continue
      }
      const sub = join(dir, e.name)
      if (existsSync(join(sub, '_status.json'))) {
        hits.push({ name: e.name, dir: sub })
      } else {
        walk(sub, depth + 1)
      }
    }
  }
  walk(root, 0)
  return hits
}

/**
 * 본체 timing.json 머지. shorts는 외부 파일(loadExternalShortsSync)에서 이미 병합되어 있으므로
 * 여기서는 그대로 통과시킨다.
 */
function mergeEpisode(content: BookRecommendScript, timing: EpisodeTimingData): BookRecommendScript {
  return {
    ...content,
    voiceTimings: timing.voiceTimings,
    narrator: { ...content.narrator, ...timing.narrator },
    host: { ...content.host, ...timing.host },
    books: content.books.map((book, i) => ({
      ...book,
      ...(timing.books?.[i] ?? {}),
    })),
    shorts: content.shorts,
  }
}

/**
 * shorts/{locale}-{N}.json · {locale}-{N}.timing.json 외부 파일 동기 로드
 * 옵션 2: 쇼츠는 본체 밖 shorts/ 에 1-based로 저장
 */
function loadExternalShortsSync(episodeDir: string, locale: string): any[] {
  const shortsDir = join(episodeDir, 'shorts')
  if (!existsSync(shortsDir)) return []

  const files = readdirSync(shortsDir)
  const contentRe = new RegExp(`^${locale}-(\\d+)\\.json$`)
  const timingRe = new RegExp(`^${locale}-(\\d+)\\.timing\\.json$`)

  const contents = new Map<number, any>()
  const timings = new Map<number, any>()

  for (const f of files) {
    if (f.endsWith('.timing.json')) {
      const m = f.match(timingRe)
      if (m) timings.set(parseInt(m[1]), loadJSON<any>(join(shortsDir, f)))
    } else if (f.endsWith('.json')) {
      const m = f.match(contentRe)
      if (m) contents.set(parseInt(m[1]), loadJSON<any>(join(shortsDir, f)))
    }
  }

  return [...contents.keys()].sort((a, b) => a - b).map(idx => {
    const c = contents.get(idx)
    const t = timings.get(idx)
    if (!t?.segments) return c
    return {
      ...c,
      segments: c.segments.map((seg: any, i: number) => ({
        ...seg,
        ...(t.segments[i] ?? {}),
      })),
    }
  })
}

function withKoImages(en: BookRecommendScript, ko: BookRecommendScript): BookRecommendScript {
  return {
    ...en,
    books: en.books.map((book, i) => ({
      ...book,
      imagePrompts: book.imagePrompts ?? ko.books[i]?.imagePrompts,
    })),
  }
}

function loadJSON<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf-8')) as T
}

function loadJSONOrNull<T>(path: string): T | null {
  if (!existsSync(path)) return null
  try { return JSON.parse(readFileSync(path, 'utf-8')) as T } catch { return null }
}

/**
 * 신구조 레이아웃 동기 로더 — sw/remotion-bo/src/lib/episode-new-layout.ts 의 sync 미러.
 *
 * 디스크 구조:
 *   {person}/
 *     meta.{locale}.json + meta.{locale}.timing.json
 *     books/{NN-제목}/
 *       book.{locale}.json + book.{locale}.timing.json
 *       shorts.{locale}.json + shorts.{locale}.timing.json
 */
function loadNewLayoutSync(personDir: string, locale: 'ko' | 'en'): BookRecommendScript | null {
  const metaContent = loadJSONOrNull<any>(join(personDir, `meta.${locale}.json`))
  if (!metaContent) return null
  const metaTiming = loadJSONOrNull<any>(join(personDir, `meta.${locale}.timing.json`)) ?? {}

  const booksDir = join(personDir, 'books')
  const folders = existsSync(booksDir)
    ? readdirSync(booksDir, { withFileTypes: true })
        .filter(e => e.isDirectory() && /^\d+-/.test(e.name))
        .map(e => e.name)
        .sort()
    : []

  const books: any[] = []
  const shortsArr: any[] = []

  for (let i = 0; i < folders.length; i++) {
    const bd = join(booksDir, folders[i])
    const book = loadJSONOrNull<any>(join(bd, `book.${locale}.json`))
    if (!book) continue
    const bookT = loadJSONOrNull<any>(join(bd, `book.${locale}.timing.json`)) ?? {}
    const merged: any = { ...book, ...bookT }
    if (bookT.quotePairDurations && Array.isArray(merged.quotePairs)) {
      merged.quotePairs = merged.quotePairs.map((p: any, pi: number) => ({
        ...p, ...(bookT.quotePairDurations[pi] ?? {}),
      }))
      delete merged.quotePairDurations
    }
    books.push(merged)

    const sc = loadJSONOrNull<any>(join(bd, `shorts.${locale}.json`))
    if (sc) {
      const st = loadJSONOrNull<any>(join(bd, `shorts.${locale}.timing.json`)) ?? {}
      const mergedShorts: any = { ...sc, featuredBookIndex: i }
      if (st.segments && Array.isArray(sc.segments)) {
        mergedShorts.segments = sc.segments.map((seg: any, si: number) => ({
          ...seg, ...(st.segments[si] ?? {}),
        }))
      }
      shortsArr.push(mergedShorts)
    }
  }

  const result: any = {
    ...metaContent,
    voiceTimings: metaTiming.voiceTimings ?? metaContent.voiceTimings,
    narrator: { ...metaContent.narrator, ...(metaTiming.narrator ?? {}) },
    host: { ...metaContent.host, ...(metaTiming.host ?? {}) },
    books,
  }
  if (shortsArr.length > 0) result.shorts = shortsArr
  return result as BookRecommendScript
}

function loadEpisodes(): Record<string, BookRecommendScript> {
  const episodes: Record<string, BookRecommendScript> = {}
  const koCache: Record<string, BookRecommendScript> = {}
  const enPending: { epName: string; script: BookRecommendScript }[] = []

  for (const { name: personName, dir: personDir } of scanPersonFolders(EPISODES_DIR)) {
    {
      const person = { name: personName }
      void person

      // 신구조 레이아웃: books/ 디렉토리 + meta.{locale}.json
      const isNewLayout = existsSync(join(personDir, 'books'))

      for (const locale of ['ko', 'en'] as const) {
        let merged: BookRecommendScript | null = null

        if (isNewLayout) {
          merged = loadNewLayoutSync(personDir, locale)
          if (!merged) continue
        } else {
          const contentPath = join(personDir, `${locale}.json`)
          if (!existsSync(contentPath)) continue
          const content = loadJSON<BookRecommendScript>(contentPath)
          // 구조 레이아웃 옵션 2: 쇼츠는 shorts/{locale}-{N}.json 외부 파일에서 로드
          const shortsArr = loadExternalShortsSync(personDir, locale)
          if (shortsArr.length > 0) (content as any).shorts = shortsArr
          const timingPath = join(personDir, `${locale}.timing.json`)
          const timing = existsSync(timingPath) ? loadJSON<EpisodeTimingData>(timingPath) : undefined
          merged = timing ? mergeEpisode(content, timing) : content
        }

        const epName = `${person.name}${locale === 'en' ? '-en' : ''}`
        if (locale === 'en') enPending.push({ epName, script: merged })
        else { koCache[epName] = merged; episodes[epName] = merged }
      }
    }
  }

  for (const { epName, script } of enPending) {
    const koName = epName.replace(/-en$/, '')
    const ko = koCache[koName]
    episodes[epName] = ko ? withKoImages(script, ko) : script
  }
  return episodes
}

const episodes = loadEpisodes()

// --- Args ---
const args = process.argv.slice(2)
const epFlag = args.indexOf('--episode')
const epFilter = epFlag >= 0 ? args[epFlag + 1] : null
const onlyFlag = args.indexOf('--only')
const only = onlyFlag >= 0 ? args[onlyFlag + 1] : null // 'longform' | 'shorts'
const langFlag = args.indexOf('--lang')
const langFilter = langFlag >= 0 ? args[langFlag + 1] : null // 'ko' | 'en'
if (langFilter && langFilter !== 'ko' && langFilter !== 'en') {
  throw new Error(`--lang 옵션은 'ko' 또는 'en'만 허용한다 (입력: ${langFilter})`)
}
const shortsIndexFlag = args.indexOf('--shorts-index')
const shortsIndexFilter = shortsIndexFlag >= 0 ? parseInt(args[shortsIndexFlag + 1], 10) : null // 1-based
if (shortsIndexFilter !== null && (!Number.isInteger(shortsIndexFilter) || shortsIndexFilter < 1)) {
  throw new Error(`--shorts-index 옵션은 1 이상 정수만 허용한다 (입력: ${args[shortsIndexFlag + 1]})`)
}
// 1권 모드 솔로 책 인덱스 필터 (0-based)
const bookIndexFlag = args.indexOf('--book-index')
const bookIndexFilter = bookIndexFlag >= 0 ? parseInt(args[bookIndexFlag + 1], 10) : null
if (bookIndexFilter !== null && (!Number.isInteger(bookIndexFilter) || bookIndexFilter < 0)) {
  throw new Error(`--book-index 옵션은 0 이상 정수만 허용한다 (입력: ${args[bookIndexFlag + 1]})`)
}

const OUT_DIR = join(__dirname, '..', '..', 'out')
mkdirSync(OUT_DIR, { recursive: true })

// --- 유틸 ---
function ts() { return new Date().toLocaleTimeString('ko-KR', { hour12: false }) }

/**
 * 진행 표시 모드:
 *  - TTY (직접 터미널 실행): 같은 줄을 \r 로 덮어써 깔끔한 진행바 표시
 *  - 비-TTY (Claude Code 백그라운드, 파일 리다이렉트, CI 등): 줄바꿈으로 찍되 일정 간격으로 throttle
 *    하지 않으면 프레임당 한 줄이라 5만 줄+가 쏟아진다
 */
const IS_TTY = !!process.stdout.isTTY
const PROGRESS_INTERVAL_MS = 3000 // 비-TTY 환경에서 진행 줄 출력 간격

function runRender(cmd: string, compId: string, cwd: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn('pnpm.cmd', cmd.split(' ').slice(1), { cwd, shell: true })
    let lastLine = ''
    let lastProgressAt = 0
    const emitProgress = (text: string, force = false) => {
      if (IS_TTY) { process.stdout.write(`\r${text}`); return }
      const now = Date.now()
      if (!force && now - lastProgressAt < PROGRESS_INTERVAL_MS) return
      lastProgressAt = now
      console.log(text)
    }

    const handleData = (data: Buffer) => {
      const lines = data.toString().split('\n').filter(Boolean)
      for (const raw of lines) {
        const line = raw.replace(/\x1b\[[0-9;]*m/g, '').trim()
        if (!line) continue

        // 번들링 진행
        const bundleMatch = line.match(/^Bundling (\d+)%/)
        if (bundleMatch) {
          const pct = +bundleMatch[1]
          emitProgress(`  📦 번들링 ${pct}%`, pct === 100)
          continue
        }

        // Public dir 복사
        const copyMatch = line.match(/^Copying public dir (.+)/)
        if (copyMatch) {
          emitProgress(`  📁 public 복사 ${copyMatch[1]}`)
          continue
        }

        // 프레임 렌더 진행
        const renderMatch = line.match(/^Rendered (\d+)\/(\d+)(?:, time remaining: (.+))?/)
        if (renderMatch) {
          const [, cur, total, remaining] = renderMatch
          const pct = ((+cur / +total) * 100).toFixed(1)
          const eta = remaining ? ` | 남은 시간: ${remaining}` : ''
          const done = +cur >= +total
          emitProgress(`  🎬 렌더 ${cur}/${total} (${pct}%)${eta}        `, done)
          continue
        }

        // 인코딩 진행
        const encodeMatch = line.match(/^Encoded (\d+)\/(\d+)/)
        if (encodeMatch) {
          const [, cur, total] = encodeMatch
          const pct = ((+cur / +total) * 100).toFixed(1)
          const done = +cur >= +total
          emitProgress(`  🔧 인코딩 ${cur}/${total} (${pct}%)        `, done)
          continue
        }

        // 출력 파일 (+ 로 시작)
        if (line.startsWith('+')) {
          if (IS_TTY) process.stdout.write('\n')
          console.log(`  ✅ ${line.slice(1).trim()}`)
          continue
        }

        lastLine = line
      }
    }

    child.stdout?.on('data', handleData)
    child.stderr?.on('data', handleData)
    child.on('close', (code) => {
      if (IS_TTY) process.stdout.write('\n')
      if (code === 0) resolve()
      else reject(new Error(`${compId} 렌더 실패 (exit ${code}). 마지막 로그: ${lastLine}`))
    })
  })
}

// --- 렌더 실행 ---
/** Root.tsx groupByPerson 로직과 동일: -en 접미사 분리 → baseName PascalCase + lang */
function toCompId(name: string) {
  const isEn = name.endsWith('-en')
  const baseName = isEn ? name.slice(0, -3) : name
  const label = baseName.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join('')
  const lang = isEn ? 'EN' : 'KO'
  return { label, lang }
}

const targetEpisodes = Object.fromEntries(
  Object.entries(episodes as Record<string, BookRecommendScript>).filter(([k]) => {
    if (epFilter && k !== epFilter && k !== `${epFilter}-en`) return false
    if (langFilter === 'ko' && k.endsWith('-en')) return false
    if (langFilter === 'en' && !k.endsWith('-en')) return false
    return true
  })
)

async function main() {
  const entries = Object.entries(targetEpisodes)
  const totalJobs: string[] = []

  // 작업 목록 사전 집계 — shortsIndex는 1-based로 일관
  for (const [name, script] of entries) {
    if (!script) continue
    const { label, lang } = toCompId(name)
    const p = `${label}-${lang}`
    if (!only || only === 'longform') totalJobs.push(`${p}-L-VID`, `${p}-L-THUMB`)
    if (!only || only === 'shorts') {
      const shortsArr = (script.shorts ?? []) as any[]
      for (let i = 0; i < shortsArr.length; i++) {
        const shortsIndex = i + 1 // 1-based
        if (shortsIndexFilter !== null && shortsIndex !== shortsIndexFilter) continue
        totalJobs.push(`${p}-S${shortsIndex}-VID`)
      }
    }
    // 1권 모드 솔로 — solos 배열 순회
    if (!only || only === 'solos') {
      const solosArr = ((script as any).solos ?? []) as Array<{ featuredBookIndex?: number }>
      for (const so of solosArr) {
        const idx = so?.featuredBookIndex
        if (typeof idx !== 'number') continue
        if (bookIndexFilter !== null && idx !== bookIndexFilter) continue
        const num = String(idx + 1).padStart(2, '0')
        totalJobs.push(`${p}-B${num}-VID`)
      }
    }
  }

  console.log(`\n${'═'.repeat(60)}`)
  console.log(`  렌더 시작 [${ts()}]`)
  console.log(`  대상: ${totalJobs.length}건 — ${totalJobs.join(', ')}`)
  console.log(`${'═'.repeat(60)}`)

  let jobIdx = 0
  for (const [name, script] of entries) {
    if (!script) { console.error(`에피소드 '${name}' 없음`); continue }
    const { label, lang } = toCompId(name)
    const compPrefix = `${label}-${lang}`
    const epDir = join(OUT_DIR, label, lang)
    mkdirSync(epDir, { recursive: true })
    const cwd = join(__dirname, '..', '..')

    // 롱폼
    if (!only || only === 'longform') {
      const compId = `${compPrefix}-L-VID`
      jobIdx++
      console.log(`\n${'─'.repeat(60)}`)
      console.log(`  [${jobIdx}/${totalJobs.length}] ▶ 롱폼 렌더: ${compId} [${ts()}]`)
      console.log(`${'─'.repeat(60)}`)
      const mp4 = join(epDir, 'L-VID.mp4')
      await runRender(`pnpm.cmd render ${compId} "${mp4}" --concurrency=75% --timeout=60000`, compId, cwd)
      console.log(`  ✓ 롱폼 완료 [${ts()}]`)

      const srt = subsToSrt(buildLongformSubs(script))
      const srtPath = join(epDir, 'L-VID.srt')
      writeFileSync(srtPath, srt, 'utf-8')
      console.log(`  ✓ SRT: ${srtPath}`)

      // 롱폼 썸네일
      const thumbId = `${compPrefix}-L-THUMB`
      jobIdx++
      console.log(`\n  [${jobIdx}/${totalJobs.length}] ▶ 롱폼 썸네일: ${thumbId} [${ts()}]`)
      const lt = join(epDir, 'L-THUMB.png')
      execSync(`pnpm.cmd remotion still ${thumbId} "${lt}" --frame=0 --image-format=png --gl=angle`, { stdio: 'inherit', cwd })
      console.log(`  ✓ 썸네일: ${lt}`)
    }

    // 쇼츠 — 배열 순회. shortsIndex는 1-based 일관 (shorts[0]=S1, shorts[1]=S2, ...)
    if (!only || only === 'shorts') {
      const shortsArr = (script.shorts ?? []) as any[]
      for (let i = 0; i < shortsArr.length; i++) {
        const shortsIndex = i + 1 // 1-based
        if (shortsIndexFilter !== null && shortsIndex !== shortsIndexFilter) continue
        const suffix = `S${shortsIndex}`
        const compId = `${compPrefix}-${suffix}-VID`
        jobIdx++
        console.log(`\n${'─'.repeat(60)}`)
        console.log(`  [${jobIdx}/${totalJobs.length}] ▶ 쇼츠 렌더: ${compId} [${ts()}]`)
        console.log(`${'─'.repeat(60)}`)
        const mp4 = join(epDir, `${suffix}-VID.mp4`)
        await runRender(`pnpm.cmd render ${compId} "${mp4}" --concurrency=75% --timeout=60000`, compId, cwd)
        console.log(`  ✓ 쇼츠 완료 [${ts()}]`)

        const srt = subsToSrt(buildShortsSubs(script, shortsIndex))
        const srtPath = join(epDir, `${suffix}-VID.srt`)
        writeFileSync(srtPath, srt, 'utf-8')
        console.log(`  ✓ SRT: ${srtPath}`)
      }
    }

    // 1권 모드 솔로 — solos 배열 순회. 컴포지션 ID: {Pascal}-{LANG}-B{NN}-VID
    if (!only || only === 'solos') {
      const solosArr = ((script as any).solos ?? []) as Array<{ featuredBookIndex?: number }>
      for (const so of solosArr) {
        const idx = so?.featuredBookIndex
        if (typeof idx !== 'number') continue
        if (bookIndexFilter !== null && idx !== bookIndexFilter) continue
        const num = String(idx + 1).padStart(2, '0')
        const suffix = `B${num}`
        const compId = `${compPrefix}-${suffix}-VID`
        jobIdx++
        console.log(`\n${'─'.repeat(60)}`)
        console.log(`  [${jobIdx}/${totalJobs.length}] ▶ 솔로 렌더: ${compId} [${ts()}]`)
        console.log(`${'─'.repeat(60)}`)
        const mp4 = join(epDir, `${suffix}-VID.mp4`)
        await runRender(`pnpm.cmd render ${compId} "${mp4}" --concurrency=75% --timeout=60000`, compId, cwd)
        console.log(`  ✓ 솔로 완료 [${ts()}]`)
        // 솔로 SRT는 음성 파이프라인 통합 후 별도 빌더 추가. wav 없는 단계에서는 SRT 생략.
      }
    }
  }

  console.log(`\n${'═'.repeat(60)}`)
  console.log(`  ✅ 전체 완료 [${ts()}] — 출력: ${OUT_DIR}`)
  console.log(`${'═'.repeat(60)}`)
}

main().catch((err) => {
  console.error(`\n❌ 렌더 실패 [${ts()}]:`, err.message)
  process.exit(1)
})
