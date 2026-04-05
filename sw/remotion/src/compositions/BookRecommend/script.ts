import type { BookRecommendScript, EpisodeTimingData, VoiceSelect } from './types'
import { mergeEpisode } from './merge-episode'
import { parseEpName } from './voice-names'

/** 현재 활성 에피소드 — TTS/렌더링 시 사용  */
export const EPISODE_NAME = 'jim-carrey'

/** 에피소드 상태 — 폴더 위치 기반 */
export type EpisodeStatus = 'done' | 'live' | 'todo'

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
  '../../../public/episodes', true, /\/(ko|en)(-\d+)?\.json$/,
)
const timingCtx = require.context(
  '../../../public/episodes', true, /\/(ko|en)(-\d+)?\.timing\.json$/,
)

/** require.context key 패턴: ./status/person/locale.json */
const PATH_RE = /^\.\/(\w+)\/([^/]+)\/((?:ko|en)(?:-\d+)?)\.json$/

/** fileLocale → epName suffix: ko→'', en→'-en', ko-2→'-2', en-2→'-2-en' */
function localeToSuffix(locale: string): string {
  const isEn = locale.startsWith('en')
  const m = locale.match(/-(\d+)/)
  return `${m ? `-${m[1]}` : ''}${isEn ? '-en' : ''}`
}

/** epName → staticFile 경로 prefix (status/person) */
export const episodeDir: Record<string, string> = {}

/** 전체 에피소드 맵 — 디렉토리 구조에서 자동 생성 */
export const episodes: Record<string, BookRecommendScript> = {}

// Phase 1: ko 에피소드 우선 로드
const koCache: Record<string, BookRecommendScript> = {}
const enPending: { epName: string; script: BookRecommendScript }[] = []

for (const key of contentCtx.keys()) {
  const m = key.match(PATH_RE)
  if (!m) continue
  const [, status, person, locale] = m

  let timing: EpisodeTimingData | undefined
  try { timing = timingCtx(key.replace(/\.json$/, '.timing.json')) as EpisodeTimingData }
  catch { /* timing 없어도 등록 */ }

  const epName = `${person}${localeToSuffix(locale)}`
  episodeDir[epName] = `${status}/${person}`

  const content = contentCtx(key) as unknown as BookRecommendScript
  const merged = timing ? mergeEpisode(content, timing) : content

  if (locale.startsWith('en')) {
    enPending.push({ epName, script: merged })
  } else {
    koCache[epName] = merged
    episodes[epName] = merged
  }
}

// Phase 2: en 에피소드 — ko imagePrompts 상속
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

/** 에피소드 음성 준비 완료 여부 */
export function isVoiceReady(ep: BookRecommendScript): boolean {
  const booksReady = ep.books.every(b => b.titleDuration > 0 && b.summaryDuration > 0)
  if (isContinuation(ep)) {
    return (ep.narrator.returnIntroDuration ?? 0) > 0 && booksReady
  }
  return (ep.host.voiceDuration ?? 0) > 0
    && (ep.narrator.celebIntroDuration ?? 0) > 0
    && booksReady
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
