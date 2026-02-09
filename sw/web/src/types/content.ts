// 콘텐츠 관련 공통 타입 정의

import type { CategoryId, VideoSubtype } from '@/constants/categories'
import type { ContentType } from './database'

export type ContentTypeCounts = Record<ContentType, number>

// #region 콘텐츠 정보 (외부 API 데이터)
// 콘텐츠 자체에 대한 정보 - 검색/기록관 공통
export interface ContentInfo {
  id: string
  type: ContentType
  category: CategoryId
  title: string
  creator?: string
  thumbnail?: string
  description?: string
  releaseDate?: string
  subtype?: VideoSubtype
  metadata: ContentMetadata | null
}

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

  // 자격증
  qualificationType?: string
  series?: string
  majorField?: string
}
// #endregion

// #region 기록 관리 (내부 DB 데이터)
// 사용자의 콘텐츠 기록 상태
export interface RecordInfo {
  userContentId: string
  status: 'WANT' | 'FINISHED'
  isRecommended?: boolean
  createdAt: string
  updatedAt: string
}
// #endregion

// #region 컴포넌트 Props 타입
// ContentInfoHeader 컴포넌트 props
export interface ContentInfoHeaderProps {
  content: ContentInfo
  variant: 'search' | 'archive'
  // 검색 페이지 전용
  onAddToArchive?: () => void
  isAdding?: boolean
  isAdded?: boolean
  // 기록관 페이지 전용
  record?: RecordInfo
  onStatusChange?: (status: RecordInfo['status']) => void
  onDelete?: () => void
  isSaving?: boolean
}
// #endregion
