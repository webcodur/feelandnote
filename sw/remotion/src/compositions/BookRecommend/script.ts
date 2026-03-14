import type { BookRecommendScript, VoiceSelect } from './types'
import elonMuskData from '../../../episodes/elon-musk.json'
import alexanderData from '../../../episodes/alexander-the-great.json'
import davinciData from '../../../episodes/leonardo-da-vinci.json'
import napoleonData from '../../../episodes/napoleon-bonaparte.json'

/** 현재 활성 에피소드 — TTS/렌더링 시 사용 */
export const EPISODE_NAME = 'alexander-the-great'

/** 전체 에피소드 맵 */
export const episodes: Record<string, BookRecommendScript> = {
  'elon-musk': elonMuskData as BookRecommendScript,
  'alexander-the-great': alexanderData as BookRecommendScript,
  'leonardo-da-vinci': davinciData as BookRecommendScript,
  'napoleon-bonaparte': napoleonData as BookRecommendScript,
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
