'use server'

import { unstable_cache } from 'next/cache'
import { STATIC_REVALIDATE } from '@/lib/cache'
import { getBookByIsbn as getKakaoBookByIsbn } from '@feelandnote/content-search/kakao-books'
import { getGoogleBookByIsbn } from '@feelandnote/content-search/google-books'
import { getVideoById } from '@feelandnote/content-search/tmdb'
import { getGameById } from '@feelandnote/content-search/igdb'
import { getTrackById } from '@feelandnote/content-search/itunes-music'
import type { ContentType } from '@/types/database'

export interface ContentMetadata {
  id: string
  metadata: Record<string, unknown> | null
  subtype?: string
  /** 실제로 응답을 돌려준 외부 출처. 요청 당시 DB 출처와 다를 수 있다. */
  source?: 'kakao_book' | 'google_books' | 'tmdb' | 'igdb' | 'itunes'
}

// 외부 API에서 메타데이터 조회 (내부 함수)
// externalId: 외부 API 식별자 (ISBN, tmdb-movie-123, igdb-123, itunes-123)
async function fetchMetadataFromApi(
  externalId: string,
  type: ContentType,
  externalSource?: string,
  locale: 'ko' | 'en' = 'ko',
): Promise<ContentMetadata> {
  switch (type) {
    case 'BOOK': {
      // ISBN이 같으면 같은 책이므로 출처 표기와 무관하게 카카오로 메타를 얻는다
      if (externalSource === 'google_books') {
        // Google Books 소스 → Google Books 우선
        const googleBook = await getGoogleBookByIsbn(externalId)
        if (googleBook) {
          return { id: externalId, metadata: googleBook.metadata, source: 'google_books' }
        }
        const kakaoBook = await getKakaoBookByIsbn(externalId)
        if (kakaoBook) {
          return { id: externalId, metadata: kakaoBook.metadata, source: 'kakao_book' }
        }
      } else {
        // 그 외(kakao_book·openlibrary·출처 미상) → 카카오 우선
        const kakaoBook = await getKakaoBookByIsbn(externalId)
        if (kakaoBook) {
          return { id: externalId, metadata: kakaoBook.metadata, source: 'kakao_book' }
        }
        const googleBook = await getGoogleBookByIsbn(externalId)
        if (googleBook) {
          return { id: externalId, metadata: googleBook.metadata, source: 'google_books' }
        }
      }

      return { id: externalId, metadata: null }
    }
    case 'VIDEO': {
      const video = await getVideoById(externalId, locale)
      return {
        id: externalId,
        metadata: video?.metadata || null,
        subtype: video?.subtype,
        source: video ? 'tmdb' : undefined,
      }
    }
    case 'GAME': {
      const game = await getGameById(externalId)
      return { id: externalId, metadata: game?.metadata || null, source: game ? 'igdb' : undefined }
    }
    case 'MUSIC': {
      if (!/^itunes[-_]\d+$/.test(externalId)) {
        return { id: externalId, metadata: null }
      }
      const track = await getTrackById(externalId)
      return { id: externalId, metadata: track?.metadata || null, source: track ? 'itunes' : undefined }
    }
    default:
      return { id: externalId, metadata: null }
  }
}

// 캐시된 메타데이터 조회 (1시간 캐싱)
const getCachedMetadata = unstable_cache(
  fetchMetadataFromApi,
  ['content-metadata-full-description-v1'],
  { revalidate: STATIC_REVALIDATE }
)

// 단일 콘텐츠 metadata 조회
// externalId: 외부 API 식별자 (ISBN, tmdb-movie-123 등)
// locale: 언어별 응답이 있는 출처(TMDB)에만 쓰인다. 캐시는 인자별로 갈린다.
export async function fetchContentMetadata(
  externalId: string,
  type: ContentType,
  externalSource?: string,
  locale: 'ko' | 'en' = 'ko',
): Promise<ContentMetadata> {
  try {
    return await getCachedMetadata(externalId, type, externalSource, locale)
  } catch (error) {
    console.error(`[fetchContentMetadata] ${type} ${externalId} 에러:`, error)
    return { id: externalId, metadata: null }
  }
}
