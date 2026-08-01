// 통합 외부 API 검색 모듈

import { searchBooks as searchKakaoBooks, type KakaoBookSearchResult } from './kakao-books'
import { searchGoogleBooks, type GoogleBookSearchResult } from './google-books'
import { searchVideo, type VideoSearchResult } from './tmdb'
import { searchGames, type GameSearchResult } from './igdb'
import { searchMusic, type MusicSearchResult } from './spotify'
import type { ContentType, SearchResponse } from './types'

// 통합 도서 검색 결과 타입 (카카오 + Google Books)
export type UnifiedBookSearchResult = KakaoBookSearchResult | GoogleBookSearchResult

// 통합 검색 결과 타입
export type ExternalSearchResult =
  | KakaoBookSearchResult
  | GoogleBookSearchResult
  | VideoSearchResult
  | GameSearchResult
  | MusicSearchResult

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

// 도서 검색 (카카오 - 사용자용 기본)
// 네이버 도서 API가 26.07.31 종료되어 카카오가 그 자리를 대신한다.
// Google Books는 일일 한도 1,000건이라 폴백으로도 쓰지 않는다(AGENTS.md).
async function searchBooksKakaoFirst(query: string, page: number): Promise<SearchResponse<ExternalSearchResult>> {
  const kakaoResult = await searchKakaoBooks(query, page)

  return {
    items: kakaoResult.items,
    total: kakaoResult.total,
    hasMore: kakaoResult.hasMore,
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

  const kakaoResult = await searchKakaoBooks(query, page)
  const mergedItems = mergeBookResults(googleResult.items, kakaoResult.items)

  return {
    items: mergedItems,
    total: Math.max(googleResult.total, kakaoResult.total),
    hasMore: googleResult.hasMore || kakaoResult.hasMore,
  }
}

// 콘텐츠 타입별 검색 함수 매핑
const searchFunctions: Record<ContentType, (query: string, page?: number) => Promise<SearchResponse<ExternalSearchResult>>> = {
  BOOK: (query, page = 1) => searchBooksKakaoFirst(query, page),
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
      : searchBooksKakaoFirst(query, page)
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
export type { KakaoBookSearchResult } from './kakao-books'
export type { GoogleBookSearchResult } from './google-books'
export type { VideoSearchResult, VideoSubtype, VideoEnLocale } from './tmdb'
export { getVideoEnLocale } from './tmdb'
export type { GameSearchResult } from './igdb'
export type { MusicSearchResult } from './spotify'
