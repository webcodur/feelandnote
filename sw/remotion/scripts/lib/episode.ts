/**
 * 에피소드 경로 해석 유틸리티
 *
 * scripts/ 하위 모든 스크립트가 공유하는 에피소드 탐색·파싱 함수.
 */
import { existsSync, readdirSync, type Dirent } from 'fs'
import { readFile, readdir } from 'fs/promises'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

/** scripts/ 의 부모 = remotion 루트 */
export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')

/** 에피소드 디렉토리 탐색.
 *  신구조: public/episodes/.../<person>/ (_status 파일 보유, 그룹 폴더 안 가능)
 *  옛 구조 폴백: public/episodes/<status>/<person>/ */
const STATUSES = ['todo', 'live', 'done'] as const
export function findEpisodeDir(person: string): string {
  const episodesRoot = join(ROOT, 'public', 'episodes')
  // 1) 신구조: 재귀 스캔으로 _status 보유 인물 폴더 매치
  function walk(dir: string, depth: number): string | null {
    let entries: Dirent[]
    try { entries = readdirSync(dir, { withFileTypes: true }) as Dirent[] } catch { return null }
    for (const e of entries) {
      if (!e.isDirectory()) continue
      if (e.name.startsWith('_')) continue
      if (depth === 0 && ((STATUSES as readonly string[]).includes(e.name) || e.name === 'pre-todo')) continue
      const sub = join(dir, e.name)
      const hasStatus = existsSync(join(sub, '_status.json'))
      if (hasStatus) {
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
  // 2) 옛 구조 폴백
  for (const status of STATUSES) {
    const dir = join(episodesRoot, status, person)
    if (existsSync(dir)) return dir
  }
  throw new Error(`Episode not found: ${person}`)
}

/** ep-name → { person, locale } 파싱
 *
 * locale 접미사("-ko" 또는 "-en")가 반드시 명시되어야 한다. 명시 누락 시
 * 잘못된 폴더에 wav 덮어쓰기 사고가 발생하므로 throw 한다.
 *
 * 과거 사고(2026-04-28): "abraham-lincoln" 으로 영문 음성 생성 명령을 줬더니
 * locale 자동 default(ko) 로 처리되어 사용자가 직접 만든 ko ElevenLabs 음성
 * 17개를 신규 합성으로 덮어쓰고 복구 불가 상태로 만들었다.
 */
export function parseEpName(epName: string): { person: string; locale: string } {
  if (epName.endsWith('-en')) return { person: epName.slice(0, -3), locale: 'en' }
  if (epName.endsWith('-ko')) return { person: epName.slice(0, -3), locale: 'ko' }
  throw new Error(
    `✗ --episode 에 locale 접미사가 필수다.\n` +
    `   받은 값: "${epName}"\n` +
    `   사용법: "${epName}-ko" (한국어) 또는 "${epName}-en" (영문)\n` +
    `   locale 자동 default 는 음성 덮어쓰기 사고를 막기 위해 차단됐다.`
  )
}

/** 신구조 여부: meta.{locale}.json 또는 books/ 가 있으면 신구조 */
export function isNewLayout(episodeDir: string, locale: string): boolean {
  return existsSync(join(episodeDir, `meta.${locale}.json`)) || existsSync(join(episodeDir, 'books'))
}

/** episodeId → JSON 파일 절대 경로 (신구조면 meta.{locale}.json, 레거시면 {locale}.json) */
export function resolveEpisodePath(episodeId: string): string {
  const { person, locale } = parseEpName(episodeId)
  const dir = findEpisodeDir(person)
  if (isNewLayout(dir, locale)) return join(dir, `meta.${locale}.json`)
  return join(dir, `${locale}.json`)
}

/** episodeId → timing JSON 파일 절대 경로 (신구조면 meta.{locale}.timing.json) */
export function resolveTimingPath(episodeId: string): string {
  const { person, locale } = parseEpName(episodeId)
  const dir = findEpisodeDir(person)
  if (isNewLayout(dir, locale)) return join(dir, `meta.${locale}.timing.json`)
  return join(dir, `${locale}.timing.json`)
}

/** 신구조 책 폴더 목록 (NN- prefix 정렬) */
async function listBookFolders(episodeDir: string): Promise<string[]> {
  const booksDir = join(episodeDir, 'books')
  if (!existsSync(booksDir)) return []
  const entries = await readdir(booksDir, { withFileTypes: true })
  return entries
    .filter(e => e.isDirectory() && /^\d+-/.test(e.name))
    .map(e => e.name)
    .sort()
}

async function readJsonOrNull(fp: string): Promise<any> {
  try { return JSON.parse(await readFile(fp, 'utf-8')) } catch { return null }
}

/**
 * shorts/{locale}-{N}.json · {locale}-{N}.timing.json 파일들을 스캔하여 배열로 로드
 *
 * 옵션 2 이후: 쇼츠 대본/타이밍은 본체 ko.json 밖의 `shorts/` 디렉토리에 분리 저장된다.
 * N은 1-based. 배열 index는 N-1.
 */
async function loadExternalShorts(episodeDir: string, locale: string): Promise<any[]> {
  const shortsDir = join(episodeDir, 'shorts')
  if (!existsSync(shortsDir)) return []

  const files = await readdir(shortsDir)
  const contentRe = new RegExp(`^${locale}-(\\d+)\\.json$`)
  const timingRe = new RegExp(`^${locale}-(\\d+)\\.timing\\.json$`)

  const contents = new Map<number, any>()
  const timings = new Map<number, any>()

  for (const f of files) {
    if (f.endsWith('.timing.json')) {
      const m = f.match(timingRe)
      if (m) timings.set(parseInt(m[1]), JSON.parse(await readFile(join(shortsDir, f), 'utf-8')))
    } else if (f.endsWith('.json')) {
      const m = f.match(contentRe)
      if (m) contents.set(parseInt(m[1]), JSON.parse(await readFile(join(shortsDir, f), 'utf-8')))
    }
  }

  const sorted = [...contents.keys()].sort((a, b) => a - b)
  return sorted.map(idx => {
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

/** 신구조 에피소드 로드 — meta + books/{NN-*}/book.{locale}.json 머지 */
async function loadNewLayoutEpisode(episodeDir: string, locale: string): Promise<any> {
  const metaContent = await readJsonOrNull(join(episodeDir, `meta.${locale}.json`))
  if (!metaContent) throw new Error(`meta.${locale}.json 없음: ${episodeDir}`)
  const metaTiming = (await readJsonOrNull(join(episodeDir, `meta.${locale}.timing.json`))) ?? {}

  const folders = await listBookFolders(episodeDir)
  const books: any[] = []
  const shortsArr: any[] = []

  for (let i = 0; i < folders.length; i++) {
    const bd = join(episodeDir, 'books', folders[i])

    const book = await readJsonOrNull(join(bd, `book.${locale}.json`))
    if (!book) continue
    const bookT = (await readJsonOrNull(join(bd, `book.${locale}.timing.json`))) ?? {}

    // __folder — 책 폴더명("09-성경")을 원소에 실어 슬롯 번호에 의존하지 않는 책 정체 식별자를 제공한다.
    // 소비자: youtube-upload 의 업로드 기록(bookFolder). 렌더는 별도 로더를 쓰므로 영향 없다.
    const merged: any = { ...book, ...bookT, __folder: folders[i] }
    if (bookT.quotePairDurations && Array.isArray(merged.quotePairs)) {
      merged.quotePairs = merged.quotePairs.map((p: any, pi: number) => ({
        ...p, ...(bookT.quotePairDurations[pi] ?? {}),
      }))
      delete merged.quotePairDurations
    }
    books.push(merged)

    const sc = await readJsonOrNull(join(bd, `shorts.${locale}.json`))
    if (sc) {
      const st = (await readJsonOrNull(join(bd, `shorts.${locale}.timing.json`))) ?? {}
      const mergedShorts: any = { ...sc, featuredBookIndex: i }
      if (st.segments && Array.isArray(sc.segments)) {
        mergedShorts.segments = sc.segments.map((seg: any, si: number) => ({
          ...seg, ...(st.segments[si] ?? {}),
        }))
      }
      shortsArr.push(mergedShorts)
    }
  }

  // slot 부여 — shorts.json의 slot 우선, 없으면 max+폴더순(미발행분은 뒤로). slot 전무 시 1..N(폴더순, 기존 동작).
  {
    let maxSlot = 0
    for (const s of shortsArr) if (typeof s?.slot === 'number') maxSlot = Math.max(maxSlot, s.slot)
    for (const s of shortsArr) if (s && typeof s.slot !== 'number') s.slot = ++maxSlot
  }

  const result: any = {
    ...metaContent,
    voiceTimings: metaTiming.voiceTimings ?? metaContent.voiceTimings,
    narrator: { ...metaContent.narrator, ...metaTiming.narrator },
    host: { ...metaContent.host, ...metaTiming.host },
    books,
  }
  if (shortsArr.length > 0) result.shorts = shortsArr
  return result
}

/** content + timing 머지하여 완전한 에피소드 데이터 반환. shorts는 외부 파일에서 로드 */
export async function loadEpisode(episodeId: string): Promise<any> {
  const { person, locale } = parseEpName(episodeId)
  const episodeDir = findEpisodeDir(person)

  // 신구조: meta.{locale}.json + books/{NN-*}/book.{locale}.json
  if (isNewLayout(episodeDir, locale)) {
    return loadNewLayoutEpisode(episodeDir, locale)
  }

  // 레거시: {locale}.json + shorts/{locale}-N.json
  const content = JSON.parse(await readFile(resolveEpisodePath(episodeId), 'utf-8'))

  // shorts 외부 파일 로드 → content.shorts 주입
  const shortsArr = await loadExternalShorts(episodeDir, locale)
  if (shortsArr.length > 0) content.shorts = shortsArr

  let timing: any = null
  try { timing = JSON.parse(await readFile(resolveTimingPath(episodeId), 'utf-8')) } catch { /* timing 없으면 content만 */ }
  if (!timing || Object.keys(timing).length === 0) return content

  return {
    ...content,
    voiceTimings: timing.voiceTimings ?? content.voiceTimings,
    narrator: { ...content.narrator, ...timing.narrator },
    host: { ...content.host, ...timing.host },
    books: content.books?.map((b: any, i: number) => ({ ...b, ...(timing.books?.[i] ?? {}) })),
    shorts: content.shorts,
  }
}
