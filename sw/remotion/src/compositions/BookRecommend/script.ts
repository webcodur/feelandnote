import type { BookRecommendScript, VoiceSelect } from './types'
import { parseEpName } from './voice-names'
// done
import alexanderData from '../../../public/episodes/done/alexander-the-great/ko.json'
import alexanderEnData from '../../../public/episodes/done/alexander-the-great/en.json'
import darioAmodeiData from '../../../public/episodes/done/dario-amodei/ko.json'
import darioAmodeiEnData from '../../../public/episodes/done/dario-amodei/en.json'
import jensenHuangData from '../../../public/episodes/done/jensen-huang/ko.json'
import jensenHuangEnData from '../../../public/episodes/done/jensen-huang/en.json'
import marcusAureliusData from '../../../public/episodes/done/marcus-aurelius/ko.json'
import marcusAureliusEnData from '../../../public/episodes/done/marcus-aurelius/en.json'
import yiSunSinData from '../../../public/episodes/done/yi-sun-sin/ko.json'
import yiSunSinEnData from '../../../public/episodes/done/yi-sun-sin/en.json'
// live
import abrahamLincolnData from '../../../public/episodes/live/abraham-lincoln/ko.json'
import elonMuskData from '../../../public/episodes/live/elon-musk/ko.json'
import elonMusk2Data from '../../../public/episodes/live/elon-musk/ko-2.json'
import elonMuskEnData from '../../../public/episodes/live/elon-musk/en.json'
import elonMusk2EnData from '../../../public/episodes/live/elon-musk/en-2.json'
import jimCarreyData from '../../../public/episodes/live/jim-carrey/ko.json'
import davinciData from '../../../public/episodes/live/leonardo-da-vinci/ko.json'
import markZuckerbergData from '../../../public/episodes/live/mark-zuckerberg/ko.json'
import napoleonData from '../../../public/episodes/live/napoleon-bonaparte/ko.json'
// todo
import albertEinsteinData from '../../../public/episodes/todo/albert-einstein/ko.json'
import galileoGalileiData from '../../../public/episodes/todo/galileo-galilei/ko.json'
import nikolaTeslaData from '../../../public/episodes/todo/nikola-tesla/ko.json'
import steveJobsData from '../../../public/episodes/todo/steve-jobs/ko.json'
import warrenBuffettData from '../../../public/episodes/todo/warren-buffett/ko.json'

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

/** epName → staticFile 경로 prefix (todo/live/done + person) */
export const episodeDir: Record<string, string> = {
  // done
  'alexander-the-great': 'done/alexander-the-great',
  'alexander-the-great-en': 'done/alexander-the-great',
  'dario-amodei': 'done/dario-amodei',
  'dario-amodei-en': 'done/dario-amodei',
  'jensen-huang': 'done/jensen-huang',
  'jensen-huang-en': 'done/jensen-huang',
  'marcus-aurelius': 'done/marcus-aurelius',
  'marcus-aurelius-en': 'done/marcus-aurelius',
  'yi-sun-sin': 'done/yi-sun-sin',
  'yi-sun-sin-en': 'done/yi-sun-sin',
  // live
  'abraham-lincoln': 'live/abraham-lincoln',
  'elon-musk': 'live/elon-musk',
  'elon-musk-2': 'live/elon-musk',
  'elon-musk-en': 'live/elon-musk',
  'elon-musk-2-en': 'live/elon-musk',
  'jim-carrey': 'live/jim-carrey',
  'leonardo-da-vinci': 'live/leonardo-da-vinci',
  'mark-zuckerberg': 'live/mark-zuckerberg',
  'napoleon-bonaparte': 'live/napoleon-bonaparte',
  // todo
  'albert-einstein': 'todo/albert-einstein',
  'galileo-galilei': 'todo/galileo-galilei',
  'nikola-tesla': 'todo/nikola-tesla',
  'steve-jobs': 'todo/steve-jobs',
  'warren-buffett': 'todo/warren-buffett',
}

/** 전체 에피소드 맵 — 폴더 위치가 상태를 결정 */
export const episodes: Record<string, BookRecommendScript> = {
  // done
  'alexander-the-great': alexanderData as BookRecommendScript,
  'alexander-the-great-en': withKoImages(alexanderEnData as BookRecommendScript, alexanderData as BookRecommendScript),
  'dario-amodei': darioAmodeiData as BookRecommendScript,
  'dario-amodei-en': withKoImages(darioAmodeiEnData as BookRecommendScript, darioAmodeiData as BookRecommendScript),
  'marcus-aurelius': marcusAureliusData as BookRecommendScript,
  'marcus-aurelius-en': withKoImages(marcusAureliusEnData as BookRecommendScript, marcusAureliusData as BookRecommendScript),
  'yi-sun-sin': yiSunSinData as BookRecommendScript,
  'yi-sun-sin-en': withKoImages(yiSunSinEnData as BookRecommendScript, yiSunSinData as BookRecommendScript),
  // live
  'abraham-lincoln': abrahamLincolnData as unknown as BookRecommendScript,
  'elon-musk': elonMuskData as BookRecommendScript,
  'elon-musk-2': elonMusk2Data as BookRecommendScript,
  'elon-musk-en': withKoImages(elonMuskEnData as BookRecommendScript, elonMuskData as BookRecommendScript),
  'elon-musk-2-en': withKoImages(elonMusk2EnData as BookRecommendScript, elonMusk2Data as BookRecommendScript),
  'jensen-huang': jensenHuangData as BookRecommendScript,
  'jensen-huang-en': withKoImages(jensenHuangEnData as BookRecommendScript, jensenHuangData as BookRecommendScript),
  'jim-carrey': jimCarreyData as unknown as BookRecommendScript,
  'leonardo-da-vinci': davinciData as BookRecommendScript,
  'mark-zuckerberg': markZuckerbergData as BookRecommendScript,
  'napoleon-bonaparte': napoleonData as BookRecommendScript,
  // todo
  'albert-einstein': albertEinsteinData as unknown as BookRecommendScript,
  'galileo-galilei': galileoGalileiData as unknown as BookRecommendScript,
  'nikola-tesla': nikolaTeslaData as unknown as BookRecommendScript,
  'steve-jobs': steveJobsData as unknown as BookRecommendScript,
  'warren-buffett': warrenBuffettData as unknown as BookRecommendScript,
}

/** 에피소드 상태 맵 — episodeDir에서 자동 추출 */
export const episodeStatus: Record<string, EpisodeStatus> = Object.fromEntries(
  Object.entries(episodeDir).map(([name, dir]) => {
    const status = dir.split('/')[0] as EpisodeStatus
    return [name, status]
  })
)

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

/** 에피소드별 voice-select 로드 */
export function loadVoiceSelect(name: string): VoiceSelect | null {
  const { person, locale } = parseEpName(name)
  const dir = episodeDir[name] ?? `todo/${person}`
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require(`../../../public/episodes/${dir}/voice/${locale}/voice-select.json`) as VoiceSelect
  } catch { return null }
}
