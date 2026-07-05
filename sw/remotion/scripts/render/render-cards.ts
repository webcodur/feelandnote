/**
 * render-cards.ts — 서재 탐방 카드뉴스 PNG 일괄 출고
 *
 * 인물의 카드 묶음을 정지 이미지(PNG)로 양산해
 *   out/cards/<인물slug>/<비율>/01-hook.png …
 * 에 번호순으로 떨군다. SNS 업로드 순서 = 파일명 번호 순서.
 *
 * 렌더는 @remotion/renderer API 로 한다 — 번들을 한 번만 만들고(bundle once)
 * selectComposition + renderStill 을 반복한다. CLI(remotion still) spawn 은 카드마다
 * 재번들링(장당 ~2분)이라 양산에 부적합해 채택하지 않는다.
 * BookCard 의 비율별 범용 컴포지션(BookCard-4x5 / 1x1 / 9x16)에
 * inputProps 로 { script, episodeName, card } 를 주입한다.
 * assetBase 는 넘기지 않는다 — remotion 렌더에서는 staticFile 기준이라 표지가 그대로 뜬다.
 *
 * Usage:
 *   pnpm render:cards                                   # 전체 인물(ko, 책 있는 인물) · 3비율
 *   pnpm render:cards -- --episode abraham-lincoln      # 특정 인물만
 *   pnpm render:cards -- --ratio 4x5                    # 특정 비율만(기본 셋 다)
 *   pnpm render:cards -- --episode abraham-lincoln --ratio 4x5
 *
 * 카드 묶음 — A 「읽은 책 N권」 (이번엔 A만 생성)
 *   01-hook   : 숫자 훅(책 권수)
 *   02-intro  : 인물 소개
 *   03-cover… : faction-cards.json 의 selected 순서대로 책 표지
 *   NN-cta    : 마무리(유튜브 안내)
 *
 * 확장 여지: B 「한 권 깊게」 묶음(intro→cover→context*→quote→cta)을 별도 디렉토리로 추가할 수 있다.
 */
import { mkdirSync, readdirSync, readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { bundle } from '@remotion/bundler'
import { selectComposition, renderStill } from '@remotion/renderer'
import type { BookRecommendScript } from '../../src/compositions/BookRecommend/types'
import type { BookCardSpec } from '../../src/compositions/BookCard/BookCard'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const REMOTION_ROOT = join(__dirname, '..', '..')
const ENTRY = join(REMOTION_ROOT, 'src', 'index.ts')
const EPISODES_DIR = join(REMOTION_ROOT, 'public', 'episodes')
const OUT_DIR = join(REMOTION_ROOT, 'out', 'cards')

// 비율별 컴포지션 ID (Root.tsx 의 BookCard 범용 컴포지션)
const RATIO_COMP: Record<string, string> = {
  '4x5': 'BookCard-4x5',
  '1x1': 'BookCard-1x1',
  '9x16': 'BookCard-9x16',
}
const ALL_RATIOS = Object.keys(RATIO_COMP)

// --- 에피소드 로드 (render-all.ts 의 ko 콘텐츠 로딩을 카드용으로 축약 — timing·shorts·배속 불필요) ---
const STATUSES = ['done', 'live', 'todo'] as const

/** episodes/ 재귀 스캔하여 _status.json 보유 인물 폴더 수집 (render-all.ts 와 동일). */
function scanPersonFolders(root: string): Array<{ name: string; dir: string }> {
  const INACTIVE = new Set(['excluded', 'pre-todo', 'todo-easy', 'todo-normal', 'todo-hard'])
  const hits: Array<{ name: string; dir: string }> = []
  function walk(dir: string, depth: number) {
    let entries
    try { entries = readdirSync(dir, { withFileTypes: true }) } catch { return }
    for (const e of entries) {
      if (!e.isDirectory() || e.name.startsWith('_')) continue
      if (depth === 0 && INACTIVE.has(e.name)) continue
      if (depth === 0 && (STATUSES as readonly string[]).includes(e.name)) {
        walk(join(dir, e.name), depth + 1)
        continue
      }
      const sub = join(dir, e.name)
      if (existsSync(join(sub, '_status.json'))) hits.push({ name: e.name, dir: sub })
      else walk(sub, depth + 1)
    }
  }
  walk(root, 0)
  return hits
}

function loadJSON<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf-8')) as T
}
function loadJSONOrNull<T>(path: string): T | null {
  if (!existsSync(path)) return null
  try { return JSON.parse(readFileSync(path, 'utf-8')) as T } catch { return null }
}

/**
 * 신구조 ko 콘텐츠 로드 — meta.ko.json + books/<NN-제목>/book.ko.json.
 * 카드는 표지·감상경위·인용만 쓰므로 timing 머지는 생략한다(영상 렌더와 달리 시각 정렬 불필요).
 */
function loadNewLayoutKo(personDir: string): BookRecommendScript | null {
  const meta = loadJSONOrNull<BookRecommendScript>(join(personDir, 'meta.ko.json'))
  if (!meta) return null
  const booksDir = join(personDir, 'books')
  const folders = existsSync(booksDir)
    ? readdirSync(booksDir, { withFileTypes: true })
        .filter(e => e.isDirectory() && /^\d+-/.test(e.name))
        .map(e => e.name).sort()
    : []
  const books: BookRecommendScript['books'] = []
  for (const f of folders) {
    const book = loadJSONOrNull<BookRecommendScript['books'][number]>(join(booksDir, f, 'book.ko.json'))
    if (book) books.push(book)
  }
  return { ...meta, books }
}

/** 인물 폴더에서 ko 스크립트 로드 — 신구조(books/) 우선, 없으면 레거시 ko.json. */
function loadPersonKo(personDir: string): BookRecommendScript | null {
  if (existsSync(join(personDir, 'books'))) return loadNewLayoutKo(personDir)
  return loadJSONOrNull<BookRecommendScript>(join(personDir, 'ko.json'))
}

// --- 편성(faction-cards.json) ---
type CardsConfig = { version?: number; selected?: number[] }

/** faction-cards.json 의 selected(선별 책 인덱스·순서). 없으면 앞 5권. 유효 인덱스만 통과. */
function resolveSelected(personDir: string, bookCount: number): number[] {
  const cfg = loadJSONOrNull<CardsConfig>(join(personDir, 'faction-cards.json'))
  const raw = cfg?.selected
  const selected = Array.isArray(raw) && raw.length > 0
    ? raw
    : Array.from({ length: Math.min(5, bookCount) }, (_, i) => i)
  return selected.filter(i => Number.isInteger(i) && i >= 0 && i < bookCount)
}

// --- A 묶음 카드 구성 ---
type CardJob = { file: string; card: BookCardSpec }

function buildBundleA(script: BookRecommendScript, selected: number[]): CardJob[] {
  const books = script.books
  const nickname = script.host.nickname
  const jobs: CardJob[] = []
  let seq = 0
  const next = (kind: string, card: BookCardSpec) => {
    seq++
    jobs.push({ file: `${String(seq).padStart(2, '0')}-${kind}`, card })
  }

  // 1) 숫자 훅 — 책 권수
  next('hook', {
    type: 'number',
    value: String(books.length),
    unit: '권의 책',
    desc: `${nickname}의 서재`,
    tag: '서재 탐방',
  })
  // 2) 인물 소개
  next('intro', { type: 'intro' })
  // 3) 선별 책 표지 (selected 순서)
  for (const bookIndex of selected) next('cover', { type: 'cover', bookIndex })
  // 4) 마무리
  next('cta', { type: 'cta' })

  return jobs
}

// --- Args ---
const args = process.argv.slice(2)
function argVal(flag: string): string | null {
  const i = args.indexOf(flag)
  return i >= 0 ? args[i + 1] ?? null : null
}
const epFilter = argVal('--episode')
const ratioFilter = argVal('--ratio')
if (ratioFilter && !RATIO_COMP[ratioFilter]) {
  throw new Error(`--ratio 옵션은 ${ALL_RATIOS.join(' / ')} 만 허용한다 (입력: ${ratioFilter})`)
}
const ratios = ratioFilter ? [ratioFilter] : ALL_RATIOS

function ts() { return new Date().toLocaleTimeString('ko-KR', { hour12: false }) }

async function main() {
  // 대상 인물 — ko, 책 있는 인물
  const persons = scanPersonFolders(EPISODES_DIR)
    .filter(({ name }) => !epFilter || name === epFilter)
    .map(({ name, dir }) => ({ name, dir, script: loadPersonKo(dir) }))
    .filter((p): p is { name: string; dir: string; script: BookRecommendScript } =>
      !!p.script && (p.script.books?.length ?? 0) > 0)

  if (persons.length === 0) {
    console.error(`대상 인물 없음${epFilter ? ` (--episode ${epFilter})` : ''}`)
    process.exit(1)
  }

  // 작업 사전 집계
  let totalCards = 0
  for (const { dir, script } of persons) {
    const selected = resolveSelected(dir, script.books.length)
    totalCards += buildBundleA(script, selected).length * ratios.length
  }

  console.log(`\n${'═'.repeat(60)}`)
  console.log(`  카드뉴스 출고 시작 [${ts()}]`)
  console.log(`  인물 ${persons.length}명 · 비율 ${ratios.join(', ')} · 카드 ${totalCards}장`)
  console.log(`${'═'.repeat(60)}`)

  // 번들은 한 번만 — 이후 모든 카드는 같은 번들에서 selectComposition + renderStill
  console.log(`  📦 번들링… [${ts()}]`)
  const serveUrl = await bundle({ entryPoint: ENTRY })
  console.log(`  ✓ 번들 완료 [${ts()}]`)

  let done = 0
  for (const { name, dir, script } of persons) {
    const selected = resolveSelected(dir, script.books.length)
    const jobs = buildBundleA(script, selected)
    console.log(`\n▶ ${name} — 책 ${script.books.length}권 중 ${selected.length}권 선별 [${ts()}]`)

    for (const ratio of ratios) {
      const outDir = join(OUT_DIR, name, ratio)
      mkdirSync(outDir, { recursive: true })
      for (const { file, card } of jobs) {
        const outPath = join(outDir, `${file}.png`)
        // assetBase 는 넘기지 않는다 — 표지를 staticFile 로 띄운다.
        // inputProps 는 selectComposition·renderStill 양쪽에 넘겨야 카드별 props 가 반영된다.
        // 컴포지션 크기는 props 와 무관하게 고정이라 selectComposition 은 가볍다.
        const inputProps = { script, episodeName: name, card }
        const composition = await selectComposition({ serveUrl, id: RATIO_COMP[ratio], inputProps })
        await renderStill({
          serveUrl,
          composition,
          output: outPath,
          inputProps,
          imageFormat: 'png',
          chromiumOptions: { gl: 'angle' },
          overwrite: true,
        })
        done++
        console.log(`  ✅ [${done}/${totalCards}] ${name}/${ratio}/${file}.png`)
      }
    }
  }

  console.log(`\n${'═'.repeat(60)}`)
  console.log(`  ✅ 출고 완료 [${ts()}] — ${OUT_DIR}`)
  console.log(`${'═'.repeat(60)}`)
  process.exit(0)
}

main().catch((err) => {
  console.error(`\n❌ 출고 실패 [${ts()}]:`, err instanceof Error ? err.message : err)
  process.exit(1)
})
