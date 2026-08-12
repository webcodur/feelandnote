// 콘텐츠 관련 공통 타입 정의

import type { VideoSubtype } from '@/constants/categories'
import type { ContentType } from './database'

export type ContentTypeCounts = Record<ContentType, number>

// #region 콘텐츠 메타데이터 (외부 API 데이터)
// 타입별 메타데이터 (API에서 가져오는 추가 속성)
export interface ContentMetadata {
  // 영상 서브타입
  subtype?: VideoSubtype

  // 책
  publisher?: string
  publishDate?: string
  isbn?: string
  genre?: string
  link?: string

  // 영상
  voteAverage?: number
  genres?: string[]
  tagline?: string
  runtime?: number
  budget?: number
  revenue?: number
  cast?: { name: string; character: string }[]
  director?: string
  backdropUrl?: string

  // 게임
  developer?: string
  rate?: number // rating -> rate? check usage. API returns 'rating', interface has 'rating'.
  rating?: number
  platforms?: string[]
  storyline?: string
  screenshots?: string[]

  // 음악
  albumType?: string
  totalTracks?: number
  artists?: string[]
  spotifyUrl?: string
  tracks?: { name: string; durationMs: number; trackNumber: number }[]
  label?: string
  copyrights?: string[]
  /* iTunes에서 받아온 음반에 붙는 값들. 음악 자료는 iTunes 출처가 다수라
     이 이름들이 실제로 채워져 있다(26.08.10 실측 — 271/317건에 itunesUrl) */
  itunesUrl?: string
  previewUrl?: string
  /** 연주자 한 명만 적힌 옛 자료. artists 배열이 없을 때 대신 쓴다 */
  performer?: string
  album?: string
}
// #endregion
