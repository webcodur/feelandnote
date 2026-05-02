/**
 * 2-synthesize/state.ts — 런타임 전역 상태
 *
 * episode 데이터는 main()에서 한 번 로드 후 setEpisode 로 등록한다.
 * 다른 모듈은 ep() 헬퍼로 접근한다 (null 가드 강제).
 */

import type { BookRecommendScript } from '../../../src/compositions/BookRecommend/types'

let _episode: BookRecommendScript | null = null

export function setEpisode(e: BookRecommendScript): void {
  _episode = e
}

/** episode 접근. main()이 setEpisode를 부르기 전에 호출하면 throw. */
export function ep(): BookRecommendScript {
  if (!_episode) throw new Error('episode가 아직 로드되지 않았다 (state.setEpisode 호출 전)')
  return _episode
}

/** 공용 음성 파일 집합 — buildJobs/매니페스트 분기에서 변경할 수 있다. */
let _commonFiles: Set<string> = new Set()

export function setCommonFiles(s: Set<string>): void {
  _commonFiles = s
}

export function commonFiles(): Set<string> {
  return _commonFiles
}
