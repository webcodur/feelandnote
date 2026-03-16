import type { BookRecommendScript, VoiceSelect } from './types'
import elonMuskData from '../../../episodes/book-recommend/elon-musk.json'
import alexanderData from '../../../episodes/book-recommend/alexander-the-great.json'
import davinciData from '../../../episodes/book-recommend/leonardo-da-vinci.json'
import davinci2Data from '../../../episodes/book-recommend/leonardo-da-vinci-2.json'
import napoleonData from '../../../episodes/book-recommend/napoleon-bonaparte.json'
import jensenHuangData from '../../../episodes/book-recommend/jensen-huang.json'
import darioAmodeiData from '../../../episodes/book-recommend/dario-amodei.json'
import markZuckerbergData from '../../../episodes/book-recommend/mark-zuckerberg.json'

/** 현재 활성 에피소드 — TTS/렌더링 시 사용 */
export const EPISODE_NAME = 'jensen-huang'

/** 전체 에피소드 맵 — 미완성도 포함 (스튜디오에서 구성 확인용) */
export const episodes: Record<string, BookRecommendScript> = {
  'elon-musk': elonMuskData as BookRecommendScript,
  'alexander-the-great': alexanderData as BookRecommendScript,
  'leonardo-da-vinci': davinciData as BookRecommendScript,
  'leonardo-da-vinci-2': davinci2Data as BookRecommendScript,
  'napoleon-bonaparte': napoleonData as BookRecommendScript,
  'jensen-huang': jensenHuangData as BookRecommendScript,
  'dario-amodei': darioAmodeiData as BookRecommendScript,
  'mark-zuckerberg': markZuckerbergData as BookRecommendScript,
}

/** continuation(2부 이상) 판별 */
export const isContinuation = (ep: BookRecommendScript) => (ep.series?.part ?? 1) > 1

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

/** 현재 에피소드 데이터 */
export const currentEpisode = episodes[EPISODE_NAME]

/** 에피소드별 voice-select 로드 */
export function loadVoiceSelect(name: string): VoiceSelect | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require(`../../../public/voice/${name}/voice-select.json`) as VoiceSelect
  } catch { return null }
}

export const voiceSelect = loadVoiceSelect(EPISODE_NAME)
