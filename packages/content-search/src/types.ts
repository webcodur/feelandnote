// 콘텐츠 타입
export type ContentType = 'BOOK' | 'VIDEO' | 'GAME' | 'MUSIC' | 'CERTIFICATE'

// 공통 검색 결과 기본 필드
export interface BaseSearchResult {
  externalId: string
  externalSource: string
  category: string
  title: string
  creator: string
  coverImageUrl: string | null
  metadata: Record<string, unknown>
}

// 검색 응답 공통 형식
export interface SearchResponse<T = BaseSearchResult> {
  items: T[]
  total: number
  hasMore: boolean
}
