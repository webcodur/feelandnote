import type { BookRecommendScript } from './types'
import elonMuskData from '../../../episodes/elon-musk.json'

/** 현재 에피소드 이름 — 전환 시 import와 함께 변경 */
export const EPISODE_NAME = 'elon-musk'

/** 현재 에피소드 데이터 */
export const currentEpisode = elonMuskData as BookRecommendScript
