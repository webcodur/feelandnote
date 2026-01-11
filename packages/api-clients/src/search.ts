// 통합 외부 API 검색 모듈

import { searchBooks, type BookSearchResult } from './naver-books'
import { searchVideo, type VideoSearchResult } from './tmdb'
import { searchGames, type GameSearchResult } from './igdb'
import { searchMusic, type MusicSearchResult } from './spotify'
import { searchCertificates, type CertificateSearchResult } from './qnet'

// 콘텐츠 타입
export type ContentType = 'BOOK' | 'VIDEO' | 'GAME' | 'MUSIC' | 'CERTIFICATE'

// 통합 검색 결과 타입
export type ExternalSearchResult =
  | BookSearchResult
  | VideoSearchResult
  | GameSearchResult
  | MusicSearchResult
  | CertificateSearchResult

export interface SearchResponse {
  items: ExternalSearchResult[]
  total: number
  hasMore: boolean
}

// 콘텐츠 타입별 검색 함수 매핑
const searchFunctions: Record<ContentType, (query: string, page?: number) => Promise<SearchResponse>> = {
  BOOK: async (query, page = 1) => {
    const result = await searchBooks(query, page)
    return {
      items: result.items,
      total: result.total,
      hasMore: result.hasMore,
    }
  },
  VIDEO: async (query, page = 1) => {
    const result = await searchVideo(query, page)
    return {
      items: result.items,
      total: result.total,
      hasMore: result.hasMore,
    }
  },
  GAME: async (query, page = 1) => {
    const result = await searchGames(query, page)
    return {
      items: result.items,
      total: result.total,
      hasMore: result.hasMore,
    }
  },
  MUSIC: async (query, page = 1) => {
    const result = await searchMusic(query, page)
    return {
      items: result.items,
      total: result.total,
      hasMore: result.hasMore,
    }
  },
  CERTIFICATE: async (query, page = 1) => {
    const result = await searchCertificates(query, page)
    return {
      items: result.items,
      total: result.total,
      hasMore: result.hasMore,
    }
  },
}

// 통합 검색 함수
export async function searchExternal(
  contentType: ContentType,
  query: string,
  page: number = 1
): Promise<SearchResponse> {
  const searchFn = searchFunctions[contentType]
  if (!searchFn) {
    throw new Error(`지원하지 않는 콘텐츠 타입: ${contentType}`)
  }
  return searchFn(query, page)
}

// 검색 결과를 DB 저장용 형식으로 변환
export function toContentRecord(result: ExternalSearchResult): {
  title: string
  creator: string
  cover_image_url: string | null
  external_id: string
  external_source: string
  metadata: Record<string, unknown>
} {
  return {
    title: result.title,
    creator: result.creator,
    cover_image_url: result.coverImageUrl,
    external_id: result.externalId,
    external_source: result.externalSource,
    metadata: result.metadata,
  }
}
