import type { BookRecommendScript, EpisodeTimingData, ShortsConfig, VoiceSelect } from './types'
import { mergeEpisode } from './merge-episode'
import { parseEpName } from './voice-names'

/** 현재 활성 에피소드 — TTS/렌더링 시 사용  */
export const EPISODE_NAME = 'jim-carrey'

/** 에피소드 상태 — 폴더 위치 기반. 스튜디오에는 done/live만 노출하고 나머지(todo, todo-*, excluded)는 제외. */
export type EpisodeStatus = 'done' | 'live'

/** 스튜디오에 노출할 폴더명 화이트리스트 — script.ts와 Root.tsx 공용 가드 */
const ACTIVE_STATUSES: ReadonlySet<string> = new Set(['done', 'live'])

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

/* ── 디렉토리 자동 탐색: public/episodes/{done|live|todo}/{person}/ ── */

const contentCtx = require.context(
  '../../../public/episodes', true, /\/(ko|en)\.json$/,
)
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

/** require.context key 패턴: ./status/person/locale.json */
const PATH_RE = /^\.\/(\w+)\/([^/]+)\/(ko|en)\.json$/

/** shorts 파일 경로 패턴 */
const SHORTS_PATH_RE = /^\.\/(\w+)\/([^/]+)\/shorts\/(ko|en)-(\d+)\.json$/
const SHORTS_TIMING_PATH_RE = /^\.\/(\w+)\/([^/]+)\/shorts\/(ko|en)-(\d+)\.timing\.json$/

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
  const m = key.match(SHORTS_PATH_RE)
  if (!m) continue
  const [, status, person, locale, idxStr] = m
  if (!ACTIVE_STATUSES.has(status)) continue
  const personKey = `${status}/${person}`
  const idx = parseInt(idxStr, 10)
  if (!Number.isFinite(idx) || idx < 1) continue
  if (!shortsContentMap[personKey]) {
    shortsContentMap[personKey] = { ko: new Map(), en: new Map() }
  }
  shortsContentMap[personKey][locale as 'ko' | 'en'].set(
    idx,
    shortsContentCtx(key) as ShortsConfig,
  )
}

for (const key of shortsTimingCtx.keys()) {
  const m = key.match(SHORTS_TIMING_PATH_RE)
  if (!m) continue
  const [, status, person, locale, idxStr] = m
  if (!ACTIVE_STATUSES.has(status)) continue
  const personKey = `${status}/${person}`
  const idx = parseInt(idxStr, 10)
  if (!Number.isFinite(idx) || idx < 1) continue
  if (!shortsTimingMap[personKey]) {
    shortsTimingMap[personKey] = { ko: new Map(), en: new Map() }
  }
  shortsTimingMap[personKey][locale as 'ko' | 'en'].set(
    idx,
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
      segments: shortsContent.segments.map((seg, i) => ({
        ...seg,
        ...(shortsTiming.segments?.[i] ?? {}),
      })),
    }
  })

  return { ...content, shorts: shortsArr }
}

// Phase 1: ko 에피소드 우선 로드
const koCache: Record<string, BookRecommendScript> = {}
const enPending: { epName: string; script: BookRecommendScript }[] = []

for (const key of contentCtx.keys()) {
  const m = key.match(PATH_RE)
  if (!m) continue
  const [, status, person, locale] = m
  if (!ACTIVE_STATUSES.has(status)) continue

  let timing: EpisodeTimingData | undefined
  try { timing = timingCtx(key.replace(/\.json$/, '.timing.json')) as EpisodeTimingData }
  catch { /* timing 없어도 등록 */ }

  const epName = locale === 'en' ? `${person}-en` : person
  const personKey = `${status}/${person}`
  episodeDir[epName] = personKey

  const rawContent = contentCtx(key) as unknown as BookRecommendScript
  // shorts 외부 파일 주입 (mergeEpisode 이전에 수행)
  const content = injectExternalShorts(rawContent, personKey, locale as 'ko' | 'en')
  const merged = timing ? mergeEpisode(content, timing) : content

  if (locale === 'en') {
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

/** 에피소드 상태 맵 — episodeDir에서 자동 추출 */
export const episodeStatus: Record<string, EpisodeStatus> = Object.fromEntries(
  Object.entries(episodeDir).map(([name, dir]) => {
    const status = dir.split('/')[0] as EpisodeStatus
    return [name, status]
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
  const dir = episodeDir[name] ?? `todo/${person}`
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require(`../../../public/episodes/${dir}/voice/${locale}/voice-select.json`) as VoiceSelect
  } catch { return null }
}
