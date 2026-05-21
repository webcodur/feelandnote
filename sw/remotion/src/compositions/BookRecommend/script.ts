import type { BookRecommendScript, EpisodeTimingData, ShortsConfig, VoiceSelect } from './types'
import { mergeEpisode } from './merge-episode'
import { parseEpName } from './voice-names'

/** 현재 활성 에피소드 — TTS/렌더링 시 사용  */
export const EPISODE_NAME = 'jim-carrey'

/** 에피소드 상태 — 각 인물 폴더의 _status.json 이 SSoT. Studio에는 done/live만 노출. */
export type EpisodeStatus = 'done' | 'live'

/** 빌드 인덱싱 시 제외할 prefix(첫 경로 segment). 옛 status 폴더는 마이그레이션 후 비어 있어
 *  남아 있어도 무해하지만 분류용 디렉토리(excluded, pre-todo, todo-easy 등)는 명시 차단. */
const INACTIVE_PREFIXES: ReadonlySet<string> = new Set([
  'excluded', 'pre-todo', 'todo-easy', 'todo-normal', 'todo-hard', 'todo',
])

/** Studio 노출 status 화이트리스트. */
const ACTIVE_STATUSES_SET: ReadonlySet<EpisodeStatus> = new Set(['done', 'live'])

/** en 에피소드에 ko의 imagePrompts 자동 상속 (이미지는 로케일 무관) */
function withKoImages(en: BookRecommendScript, ko: BookRecommendScript): BookRecommendScript {
  return {
    ...en,
    books: en.books.map((book, i) => ({
      ...book,
      imagePrompts: book.imagePrompts ?? ko.books[i]?.imagePrompts,
    })),
  }
}

/** 쇼츠 segment 머지 — timing이 content를 덮어쓰되, imageChangeAt 안의 image·text는 content 우선.
 *  timing 측은 t·duration·voiceTimings 같은 「타이밍 데이터」만 가져온다. content가 SSoT인 image·text를
 *  timing이 덮어버리는 과거 버그(timing.json의 옛 파일명이 살아남아 영상에 옛 컷이 뜨는 문제) 방지. */
function mergeShortsSegment(content: any, timing: any): any {
  if (!timing) return content
  const contentChanges = content.imageChangeAt as Array<Record<string, unknown>> | undefined
  const timingChanges = timing.imageChangeAt as Array<Record<string, unknown>> | undefined
  let mergedChanges: Array<Record<string, unknown>> | undefined = contentChanges
  if (Array.isArray(contentChanges) && Array.isArray(timingChanges)) {
    mergedChanges = contentChanges.map((c, j) => {
      const tVal = timingChanges[j]?.t
      return typeof tVal === 'number' ? { ...c, t: tVal } : c
    })
  } else if (!contentChanges && Array.isArray(timingChanges)) {
    // content에 imageChangeAt이 없는 예외 — timing에서 가져오되 image 경로가 옛것일 수 있어 위험.
    // 안전을 위해 image·text가 있는 timing 항목은 그대로 사용한다(레거시 폴백).
    mergedChanges = timingChanges
  }
  const { imageChangeAt: _ignored, ...timingRest } = timing
  return {
    ...content,
    ...timingRest,
    ...(mergedChanges !== undefined ? { imageChangeAt: mergedChanges } : {}),
  }
}

/* ── 디렉토리 자동 탐색: public/episodes/{done|live|todo}/{person}/ ── */

const contentCtx = require.context(
  '../../../public/episodes', true, /\/(ko|en)\.json$/,
)

/** _status.json 인덱스 — 신구조 인물 폴더 식별 + status 매핑.
 *  key 패턴: './<person>/_status.json' 또는 './<group>/<person>/_status.json' */
const statusCtx = require.context(
  '../../../public/episodes', true, /\/_status\.json$/,
)
const STATUS_PATH_RE_FLAT = /^\.\/([^/]+)\/_status\.json$/
const STATUS_PATH_RE_GROUP = /^\.\/([^/]+)\/([^/]+)\/_status\.json$/

/** epName(person 또는 person-en) 와 무관하게 person → 폴더 상대 경로(prefix 포함). */
const personToDir: Record<string, string> = {}
/** person → status(_status.json 내용) */
const personToStatus: Record<string, EpisodeStatus> = {}

/** epName(또는 person) → 소속 그룹명. 폴더가 1-depth면 null(소속 없음). */
export function getEpisodeGroup(epNameOrPerson: string): string | null {
  const person = epNameOrPerson.replace(/-en$/, '')
  const dir = personToDir[person]
  if (!dir) return null
  const segs = dir.split('/')
  return segs.length >= 2 ? segs[0] : null
}

for (const key of statusCtx.keys()) {
  let person: string, dir: string
  const groupM = key.match(STATUS_PATH_RE_GROUP)
  if (groupM) {
    const prefix = groupM[1]
    if (INACTIVE_PREFIXES.has(prefix)) continue
    person = groupM[2]
    dir = `${prefix}/${person}`
  } else {
    const flatM = key.match(STATUS_PATH_RE_FLAT)
    if (!flatM) continue
    person = flatM[1]
    if (INACTIVE_PREFIXES.has(person)) continue
    dir = person
  }
  const raw = statusCtx(key) as { status?: string } | string
  const status = (typeof raw === 'string' ? raw : raw?.status) as EpisodeStatus | undefined
  if (!status || !ACTIVE_STATUSES_SET.has(status)) continue // todo 등은 Studio 미노출
  personToDir[person] = dir
  personToStatus[person] = status
}

/** 이미지 자산 스캔 — 신구조에서는 basename만 들고 다닌다. 인물별로 어느 책 폴더(혹은 ref/)에
 *  실제 파일이 있는지 빌드 타임에 매핑한다. 같은 파일명이 여러 위치에 있을 경우 첫 등장 우선. */
const imageCtx = require.context(
  '../../../public/episodes', true, /\.(png|jpe?g|webp|gif)$/i,
)

/** 경로 키 파싱 — person 식별 + dir 추출. INACTIVE prefix 차단. */
function parsePathKey(key: string, restPattern: string): { person: string; dir: string; rest: RegExpMatchArray } | null {
  // 옛 구조/그룹: ./prefix/person/<rest>
  const groupRe = new RegExp(`^\\.\\/([^/]+)\\/([^/]+)\\/${restPattern}$`)
  // 신구조 1-depth: ./person/<rest>
  const flatRe = new RegExp(`^\\.\\/([^/]+)\\/${restPattern}$`)
  const g = key.match(groupRe)
  if (g) {
    const prefix = g[1]
    if (!INACTIVE_PREFIXES.has(prefix)) {
      const person = g[2]
      return { person, dir: `${prefix}/${person}`, rest: g.slice(3) as unknown as RegExpMatchArray }
    }
  }
  const f = key.match(flatRe)
  if (f) {
    const person = f[1]
    if (!INACTIVE_PREFIXES.has(person)) {
      return { person, dir: person, rest: f.slice(2) as unknown as RegExpMatchArray }
    }
  }
  return null
}

const imagePathByBasename: Record<string, Record<string, string>> = {}
for (const key of imageCtx.keys()) {
  const m = key.match(/^\.\/(.+)$/)
  if (!m) continue
  const rel = m[1]
  const firstSeg = rel.split('/')[0]
  if (INACTIVE_PREFIXES.has(firstSeg)) continue
  // person 추출: 신구조면 첫 segment, 옛/그룹이면 두 번째 segment
  // statusCtx 결과의 personToDir이 신뢰할 SSoT — 매칭되는 dir로 person 식별
  let matchedPerson: string | null = null
  for (const [person, dir] of Object.entries(personToDir)) {
    if (rel === dir || rel.startsWith(dir + '/')) { matchedPerson = person; break }
  }
  if (!matchedPerson) continue
  const basename = rel.split('/').pop()!
  if (!imagePathByBasename[matchedPerson]) imagePathByBasename[matchedPerson] = {}
  if (imagePathByBasename[matchedPerson][basename] === undefined) {
    imagePathByBasename[matchedPerson][basename] = `episodes/${rel}`
  }
}

/** 이미지 참조 → public 기준 풀 경로(episodes/...).
 *  - 'episodes/...' 로 시작하면 그대로 반환
 *  - basename 또는 슬래시 포함 상대경로면 인물 매핑에서 basename 으로 조회
 *  - 매핑 실패 시 폴백(episodes/{dir}/images/{file}) */
export function resolveImageFile(epName: string, file: string): string {
  if (!file) return file
  if (file.startsWith('episodes/')) return file
  const person = epName.replace(/-en$/, '')
  const dir = episodeDir[epName] ?? personToDir[person] ?? person
  const basename = file.split('/').pop() ?? file
  const mapped = imagePathByBasename[person]?.[basename]
  if (mapped) return mapped
  return `episodes/${dir}/images/${basename}`
}
const timingCtx = require.context(
  '../../../public/episodes', true, /\/(ko|en)\.timing\.json$/,
)

/** 쇼츠 분리 파일 스캔 — 옵션 2: shorts/{locale}-{N}.json, shorts/{locale}-{N}.timing.json */
const shortsContentCtx = require.context(
  '../../../public/episodes', true, /\/shorts\/(ko|en)-\d+\.json$/,
)
const shortsTimingCtx = require.context(
  '../../../public/episodes', true, /\/shorts\/(ko|en)-\d+\.timing\.json$/,
)

/** 신구조(책 단위 분할) 스캔 — meta + books/{NN-제목}/book·shorts */
const metaContentCtx = require.context(
  '../../../public/episodes', true, /\/meta\.(ko|en)\.json$/,
)
const metaTimingCtx = require.context(
  '../../../public/episodes', true, /\/meta\.(ko|en)\.timing\.json$/,
)
const newBookContentCtx = require.context(
  '../../../public/episodes', true, /\/books\/[^/]+\/book\.(ko|en)\.json$/,
)
const newBookTimingCtx = require.context(
  '../../../public/episodes', true, /\/books\/[^/]+\/book\.(ko|en)\.timing\.json$/,
)
const newShortsContentCtx = require.context(
  '../../../public/episodes', true, /\/books\/[^/]+\/shorts\.(ko|en)\.json$/,
)
const newShortsTimingCtx = require.context(
  '../../../public/episodes', true, /\/books\/[^/]+\/shorts\.(ko|en)\.timing\.json$/,
)

/** 경로 키 → person·locale·extras 매칭. prefix 1개(옛 status 또는 그룹) 옵션. */
type LegacyContentMatch = { person: string; dir: string; locale: 'ko' | 'en' }
function matchContent(key: string): LegacyContentMatch | null {
  const parsed = parsePathKey(key, '(ko|en)\\.json')
  if (!parsed) return null
  return { person: parsed.person, dir: parsed.dir, locale: parsed.rest[0] as 'ko' | 'en' }
}
type ShortsMatch = LegacyContentMatch & { idx: number }
function matchShorts(key: string): ShortsMatch | null {
  const parsed = parsePathKey(key, 'shorts\\/(ko|en)-(\\d+)\\.json')
  if (!parsed) return null
  return { person: parsed.person, dir: parsed.dir, locale: parsed.rest[0] as 'ko' | 'en', idx: parseInt(parsed.rest[1], 10) }
}
function matchShortsTiming(key: string): ShortsMatch | null {
  const parsed = parsePathKey(key, 'shorts\\/(ko|en)-(\\d+)\\.timing\\.json')
  if (!parsed) return null
  return { person: parsed.person, dir: parsed.dir, locale: parsed.rest[0] as 'ko' | 'en', idx: parseInt(parsed.rest[1], 10) }
}
function matchMeta(key: string): LegacyContentMatch | null {
  const parsed = parsePathKey(key, 'meta\\.(ko|en)\\.json')
  if (!parsed) return null
  return { person: parsed.person, dir: parsed.dir, locale: parsed.rest[0] as 'ko' | 'en' }
}
function matchMetaTiming(key: string): LegacyContentMatch | null {
  const parsed = parsePathKey(key, 'meta\\.(ko|en)\\.timing\\.json')
  if (!parsed) return null
  return { person: parsed.person, dir: parsed.dir, locale: parsed.rest[0] as 'ko' | 'en' }
}
type NewBookMatch = LegacyContentMatch & { slug: string }
function matchNewBook(key: string): NewBookMatch | null {
  const parsed = parsePathKey(key, 'books\\/([^/]+)\\/book\\.(ko|en)\\.json')
  if (!parsed) return null
  return { person: parsed.person, dir: parsed.dir, slug: parsed.rest[0], locale: parsed.rest[1] as 'ko' | 'en' }
}
function matchNewBookTiming(key: string): NewBookMatch | null {
  const parsed = parsePathKey(key, 'books\\/([^/]+)\\/book\\.(ko|en)\\.timing\\.json')
  if (!parsed) return null
  return { person: parsed.person, dir: parsed.dir, slug: parsed.rest[0], locale: parsed.rest[1] as 'ko' | 'en' }
}
function matchNewShorts(key: string): NewBookMatch | null {
  const parsed = parsePathKey(key, 'books\\/([^/]+)\\/shorts\\.(ko|en)\\.json')
  if (!parsed) return null
  return { person: parsed.person, dir: parsed.dir, slug: parsed.rest[0], locale: parsed.rest[1] as 'ko' | 'en' }
}
function matchNewShortsTiming(key: string): NewBookMatch | null {
  const parsed = parsePathKey(key, 'books\\/([^/]+)\\/shorts\\.(ko|en)\\.timing\\.json')
  if (!parsed) return null
  return { person: parsed.person, dir: parsed.dir, slug: parsed.rest[0], locale: parsed.rest[1] as 'ko' | 'en' }
}

/** epName → staticFile 경로 prefix (status/person) */
export const episodeDir: Record<string, string> = {}

/** 전체 에피소드 맵 — 디렉토리 구조에서 자동 생성 */
export const episodes: Record<string, BookRecommendScript> = {}

/** 쇼츠 외부 파일 수집 — personKey(`status/person`) → locale → idx → 데이터 */
type ShortsContentBuckets = { ko: Map<number, ShortsConfig>; en: Map<number, ShortsConfig> }
type ShortsTimingBuckets = {
  ko: Map<number, { segments?: Array<{ duration?: number }> }>
  en: Map<number, { segments?: Array<{ duration?: number }> }>
}

const shortsContentMap: Record<string, ShortsContentBuckets> = {}
const shortsTimingMap: Record<string, ShortsTimingBuckets> = {}

for (const key of shortsContentCtx.keys()) {
  // 방어: .timing.json 이 첫 정규식에 잡혀도 skip
  if (key.endsWith('.timing.json')) continue
  const r = matchShorts(key)
  if (!r) continue
  if (!personToStatus[r.person]) continue
  const personKey = r.person
  if (!Number.isFinite(r.idx) || r.idx < 1) continue
  if (!shortsContentMap[personKey]) {
    shortsContentMap[personKey] = { ko: new Map(), en: new Map() }
  }
  shortsContentMap[personKey][r.locale].set(
    r.idx,
    shortsContentCtx(key) as ShortsConfig,
  )
}

for (const key of shortsTimingCtx.keys()) {
  const r = matchShortsTiming(key)
  if (!r) continue
  if (!personToStatus[r.person]) continue
  const personKey = r.person
  if (!Number.isFinite(r.idx) || r.idx < 1) continue
  if (!shortsTimingMap[personKey]) {
    shortsTimingMap[personKey] = { ko: new Map(), en: new Map() }
  }
  shortsTimingMap[personKey][r.locale].set(
    r.idx,
    shortsTimingCtx(key) as { segments?: Array<{ duration?: number }> },
  )
}

/** 쇼츠 외부 파일 주입 — content.shorts 배열을 1-based idx 순서로 채운다.
 *  timing 파일이 있으면 segments[i].duration을 머지한다.
 *
 *  방어 로직: 외부 shorts 파일이 없는 에피소드에서 본체 ko.json에 레거시로 남아있는
 *  shorts 필드(단일 객체 또는 배열)를 배열로 정규화한다. 누락된 에피소드가 있어도
 *  Root.tsx의 arr.map 크래시를 막는 최후의 안전장치. */
function injectExternalShorts(
  content: BookRecommendScript,
  personKey: string,
  locale: 'ko' | 'en',
): BookRecommendScript {
  const contentMap = shortsContentMap[personKey]?.[locale]
  if (!contentMap || contentMap.size === 0) {
    // 외부 파일 없음 → 본체 content.shorts 정규화 (단일 객체 → 배열)
    const rawShorts = (content as unknown as { shorts?: unknown }).shorts
    if (rawShorts == null) return content
    if (Array.isArray(rawShorts)) return content
    // 단일 객체 → 배열 감싸기. 경고 로그 (마이그레이션 누락 감지용)
    if (typeof window !== 'undefined') {
      console.warn(
        `[shorts 마이그레이션 누락] ${personKey} ${locale}: ko.json에 레거시 shorts 필드가 남아있다. shorts/${locale}-1.json으로 분리 필요.`,
      )
    }
    return { ...content, shorts: [rawShorts as ShortsConfig] }
  }

  const timingMap = shortsTimingMap[personKey]?.[locale]
  const sortedIdxs = [...contentMap.keys()].sort((a, b) => a - b)

  const shortsArr: ShortsConfig[] = sortedIdxs.map((idx) => {
    const shortsContent = contentMap.get(idx)!
    const shortsTiming = timingMap?.get(idx)
    if (!shortsTiming?.segments) return shortsContent
    return {
      ...shortsContent,
      segments: shortsContent.segments.map((seg, i) =>
        mergeShortsSegment(seg, shortsTiming.segments?.[i]),
      ),
    }
  })

  return { ...content, shorts: shortsArr }
}

/** 신구조 수집 — personKey → locale → { meta, metaTiming, books[], shorts[] } */
type NewLayoutBucket = {
  meta?: any
  metaTiming?: any
  books: Map<string, { content?: any; timing?: any }>      // slug → 책 데이터
  shorts: Map<string, { content?: any; timing?: any }>     // slug → 쇼츠 데이터
}
const newLayoutMap: Record<string, { ko: NewLayoutBucket; en: NewLayoutBucket }> = {}
const newLayoutPersons = new Set<string>() // `status/person` — 레거시 분기에서 skip 용

function getBucket(personKey: string, locale: 'ko' | 'en'): NewLayoutBucket {
  if (!newLayoutMap[personKey]) {
    newLayoutMap[personKey] = {
      ko: { books: new Map(), shorts: new Map() },
      en: { books: new Map(), shorts: new Map() },
    }
  }
  return newLayoutMap[personKey][locale]
}

for (const key of metaContentCtx.keys()) {
  const r = matchMeta(key)
  if (!r) continue
  if (!personToStatus[r.person]) continue
  newLayoutPersons.add(r.person)
  getBucket(r.person, r.locale).meta = metaContentCtx(key)
}
for (const key of metaTimingCtx.keys()) {
  const r = matchMetaTiming(key)
  if (!r) continue
  if (!personToStatus[r.person]) continue
  getBucket(r.person, r.locale).metaTiming = metaTimingCtx(key)
}
for (const key of newBookContentCtx.keys()) {
  const r = matchNewBook(key)
  if (!r) continue
  if (!personToStatus[r.person]) continue
  const b = getBucket(r.person, r.locale)
  if (!b.books.has(r.slug)) b.books.set(r.slug, {})
  b.books.get(r.slug)!.content = newBookContentCtx(key)
}
for (const key of newBookTimingCtx.keys()) {
  const r = matchNewBookTiming(key)
  if (!r) continue
  if (!personToStatus[r.person]) continue
  const b = getBucket(r.person, r.locale)
  if (!b.books.has(r.slug)) b.books.set(r.slug, {})
  b.books.get(r.slug)!.timing = newBookTimingCtx(key)
}
for (const key of newShortsContentCtx.keys()) {
  const r = matchNewShorts(key)
  if (!r) continue
  if (!personToStatus[r.person]) continue
  const b = getBucket(r.person, r.locale)
  if (!b.shorts.has(r.slug)) b.shorts.set(r.slug, {})
  b.shorts.get(r.slug)!.content = newShortsContentCtx(key)
}
for (const key of newShortsTimingCtx.keys()) {
  const r = matchNewShortsTiming(key)
  if (!r) continue
  if (!personToStatus[r.person]) continue
  const b = getBucket(r.person, r.locale)
  if (!b.shorts.has(r.slug)) b.shorts.set(r.slug, {})
  b.shorts.get(r.slug)!.timing = newShortsTimingCtx(key)
}

/** 신구조 버킷 → 레거시 BookRecommendScript 형태로 조립 */
function assembleNewLayout(bucket: NewLayoutBucket): BookRecommendScript | null {
  if (!bucket.meta) return null
  const slugs = [...bucket.books.keys()].sort()
  const books: any[] = []
  const shortsArr: any[] = []
  for (let i = 0; i < slugs.length; i++) {
    const slug = slugs[i]
    const bk = bucket.books.get(slug)!
    if (!bk.content) continue
    const merged: any = { ...bk.content, ...(bk.timing ?? {}) }
    if (bk.timing?.quotePairDurations && Array.isArray(merged.quotePairs)) {
      merged.quotePairs = merged.quotePairs.map((p: any, pi: number) => ({
        ...p, ...(bk.timing.quotePairDurations[pi] ?? {}),
      }))
      delete merged.quotePairDurations
    }
    books.push(merged)

    const sc = bucket.shorts.get(slug)
    if (sc?.content) {
      const mergedShorts: any = { ...sc.content, featuredBookIndex: i }
      if (sc.timing?.segments && Array.isArray(sc.content.segments)) {
        mergedShorts.segments = sc.content.segments.map((seg: any, si: number) =>
          mergeShortsSegment(seg, sc.timing.segments[si]),
        )
      }
      shortsArr.push(mergedShorts)
    }
  }
  const metaTiming = bucket.metaTiming ?? {}
  const result: any = {
    ...bucket.meta,
    voiceTimings: metaTiming.voiceTimings ?? bucket.meta.voiceTimings,
    narrator: { ...bucket.meta.narrator, ...(metaTiming.narrator ?? {}) },
    host: { ...bucket.meta.host, ...(metaTiming.host ?? {}) },
    books,
  }
  if (shortsArr.length > 0) {
    result.shorts = shortsArr
  } else if (result.shorts != null && !Array.isArray(result.shorts)) {
    // meta.{locale}.json에 inline shorts(객체)가 남아있는 마이그레이션 잔재 — 배열로 정규화
    if (typeof window !== 'undefined') {
      console.warn(
        '[shorts 마이그레이션 누락] meta에 inline shorts(객체)가 남아있다. 신구조 books/<slug>/shorts.{ko,en}.json으로 이동 필요.',
      )
    }
    result.shorts = [result.shorts]
  }
  return result as BookRecommendScript
}

// Phase 1: ko 에피소드 우선 로드
const koCache: Record<string, BookRecommendScript> = {}
const enPending: { epName: string; script: BookRecommendScript }[] = []

// Phase 1a: 신구조 인물 등록
for (const person of newLayoutPersons) {
  const buckets = newLayoutMap[person]
  const dir = personToDir[person] ?? person
  for (const locale of ['ko', 'en'] as const) {
    const assembled = assembleNewLayout(buckets[locale])
    if (!assembled) continue
    const epName = locale === 'en' ? `${person}-en` : person
    episodeDir[epName] = dir
    if (locale === 'en') enPending.push({ epName, script: assembled })
    else { koCache[epName] = assembled; episodes[epName] = assembled }
  }
}

// Phase 1b: 레거시 인물 등록 (ko.json 단일 파일 구조)
for (const key of contentCtx.keys()) {
  const r = matchContent(key)
  if (!r) continue
  if (!personToStatus[r.person]) continue
  // 신구조(meta.{locale}.json) 인물은 여기서 skip
  if (newLayoutPersons.has(r.person)) continue

  let timing: EpisodeTimingData | undefined
  try { timing = timingCtx(key.replace(/\.json$/, '.timing.json')) as EpisodeTimingData }
  catch { /* timing 없어도 등록 */ }

  const epName = r.locale === 'en' ? `${r.person}-en` : r.person
  episodeDir[epName] = r.dir

  const rawContent = contentCtx(key) as unknown as BookRecommendScript
  // shorts 외부 파일 주입 (mergeEpisode 이전에 수행)
  const content = injectExternalShorts(rawContent, r.person, r.locale)
  const merged = timing ? mergeEpisode(content, timing) : content

  if (r.locale === 'en') {
    enPending.push({ epName, script: merged })
  } else {
    koCache[epName] = merged
    episodes[epName] = merged
  }
}

// Phase 2: en 에피소드 등록 (ko imagePrompts 상속)
for (const { epName, script } of enPending) {
  const koName = epName.replace(/-en$/, '')
  const ko = koCache[koName]
  episodes[epName] = ko ? withKoImages(script, ko) : script
}

/** 에피소드 상태 맵 — personToStatus에서 추출 */
export const episodeStatus: Record<string, EpisodeStatus> = Object.fromEntries(
  Object.keys(episodeDir).map(name => {
    const person = name.replace(/-en$/, '')
    return [name, personToStatus[person] ?? 'live']
  })
)

/** continuation — timing.ts에서 가져와 re-export */
export { isContinuation } from './timing'
import { isContinuation } from './timing'

/** 에피소드 음성 준비 완료 여부.
 *
 *  단일 wav 누락(예: B2-philosophy)이 전체 hasVoice 분기를 무너뜨려
 *  sfx·다른 음성·이미지 스케줄까지 차단되는 사고를 막기 위해
 *  booksReady만 게이트한다. 개별 음성 슬롯은 자체 duration 가드로
 *  존재 여부를 판단해 누락분만 무음 처리된다.
 */
export function isVoiceReady(ep: BookRecommendScript): boolean {
  return ep.books.every(b => b.titleDuration > 0 && b.summaryDuration > 0)
}

/** 에피소드별 voice-select 로드 */
export function loadVoiceSelect(name: string): VoiceSelect | null {
  const { person, locale } = parseEpName(name)
  const dir = episodeDir[name] ?? personToDir[person] ?? person
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require(`../../../public/episodes/${dir}/voice/${locale}/voice-select.json`) as VoiceSelect
  } catch { return null }
}
