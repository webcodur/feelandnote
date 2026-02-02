// 통합 외부 API 검색 모듈

import { searchBooks as searchNaverBooks, type BookSearchResult } from './naver-books'
import { searchGoogleBooks, type GoogleBookSearchResult } from './google-books'
import { searchVideo, type VideoSearchResult } from './tmdb'
import { searchGames, type GameSearchResult } from './igdb'
import { searchMusic, type MusicSearchResult } from './spotify'
import { searchCertificates, type CertificateSearchResult } from './qnet'
import type { ContentType, SearchResponse } from './types'

// 통합 도서 검색 결과 타입 (네이버 + Google Books)
export type UnifiedBookSearchResult = BookSearchResult | GoogleBookSearchResult

// 통합 검색 결과 타입
export type ExternalSearchResult =
  | BookSearchResult
  | GoogleBookSearchResult
  | VideoSearchResult
  | GameSearchResult
  | MusicSearchResult
  | CertificateSearchResult

// 도서 검색 결과 병합 (ISBN 기준 중복 제거)
function mergeBookResults(
  primaryItems: UnifiedBookSearchResult[],
  secondaryItems: UnifiedBookSearchResult[]
): UnifiedBookSearchResult[] {
  const isbnSet = new Set(primaryItems.map(item => item.metadata.isbn).filter(Boolean))
  const uniqueSecondaryItems = secondaryItems.filter(
    item => item.metadata.isbn && !isbnSet.has(item.metadata.isbn)
  )
  return [...primaryItems, ...uniqueSecondaryItems]
}

// 도서 검색 (네이버 우선 - 사용자용)
async function searchBooksNaverFirst(query: string, page: number): Promise<SearchResponse<ExternalSearchResult>> {
  const naverResult = await searchNaverBooks(query, page)

  if (naverResult.items.length >= 10) {
    return {
      items: naverResult.items,
      total: naverResult.total,
      hasMore: naverResult.hasMore,
    }
  }

  const googleResult = await searchGoogleBooks(query, page)
  const mergedItems = mergeBookResults(naverResult.items, googleResult.items)

  return {
    items: mergedItems,
    total: Math.max(naverResult.total, googleResult.total),
    hasMore: naverResult.hasMore || googleResult.hasMore,
  }
}

// 도서 검색 (구글 우선 - 관리자용)
async function searchBooksGoogleFirst(query: string, page: number): Promise<SearchResponse<ExternalSearchResult>> {
  const googleResult = await searchGoogleBooks(query, page)

  if (googleResult.items.length >= 10) {
    return {
      items: googleResult.items,
      total: googleResult.total,
      hasMore: googleResult.hasMore,
    }
  }

  const naverResult = await searchNaverBooks(query, page)
  const mergedItems = mergeBookResults(googleResult.items, naverResult.items)

  return {
    items: mergedItems,
    total: Math.max(googleResult.total, naverResult.total),
    hasMore: googleResult.hasMore || naverResult.hasMore,
  }
}

// 콘텐츠 타입별 검색 함수 매핑
const searchFunctions: Record<ContentType, (query: string, page?: number) => Promise<SearchResponse<ExternalSearchResult>>> = {
  BOOK: (query, page = 1) => searchBooksNaverFirst(query, page),
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

export interface SearchOptions {
  preferGoogle?: boolean // 도서 검색 시 구글 우선 (관리자용)
}

// 통합 검색 함수
export async function searchExternal(
  contentType: ContentType,
  query: string,
  page: number = 1,
  options: SearchOptions = {}
): Promise<SearchResponse<ExternalSearchResult>> {
  // 도서 검색은 옵션에 따라 분기
  if (contentType === 'BOOK') {
    return options.preferGoogle
      ? searchBooksGoogleFirst(query, page)
      : searchBooksNaverFirst(query, page)
  }

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

// Re-export types for convenience
export type { ContentType, SearchResponse } from './types'
export type { BookSearchResult } from './naver-books'
export type { GoogleBookSearchResult } from './google-books'
export type { VideoSearchResult, VideoSubtype } from './tmdb'
export type { GameSearchResult } from './igdb'
export type { MusicSearchResult } from './spotify'
export type { CertificateSearchResult } from './qnet'
