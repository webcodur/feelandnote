'use server'

import { unstable_cache } from 'next/cache'
import { STATIC_REVALIDATE } from '@/lib/cache'
import { getBookByIsbn as getKakaoBookByIsbn } from '@feelandnote/content-search/kakao-books'
import { getGoogleBookByIsbn } from '@feelandnote/content-search/google-books'
import { getVideoById } from '@feelandnote/content-search/tmdb'
import { getGameById } from '@feelandnote/content-search/igdb'
import { getAlbumById } from '@feelandnote/content-search/spotify'
import type { ContentType } from '@/types/database'

export interface ContentMetadata {
  id: string
  metadata: Record<string, unknown> | null
  subtype?: string
}

// 외부 API에서 메타데이터 조회 (내부 함수)
// externalId: 외부 API 식별자 (ISBN, tmdb-movie-123, igdb-123, spotify-xxx)
async function fetchMetadataFromApi(
  externalId: string,
  type: ContentType,
  externalSource?: string
): Promise<ContentMetadata> {
  switch (type) {
    case 'BOOK': {
      // 네이버 도서 API는 26.07.31 종료. 기존 naver_book 소스 콘텐츠도 카카오로 재조회한다
      // (ISBN이 같으면 같은 책이므로 소스 표기와 무관하게 메타를 얻을 수 있다)
      if (externalSource === 'google_books') {
        // Google Books 소스 → Google Books 우선
        const googleBook = await getGoogleBookByIsbn(externalId)
        if (googleBook) {
          return { id: externalId, metadata: googleBook.metadata }
        }
        const kakaoBook = await getKakaoBookByIsbn(externalId)
        if (kakaoBook) {
          return { id: externalId, metadata: kakaoBook.metadata }
        }
      } else {
        // 그 외(kakao_book·naver_book·openlibrary) → 카카오 우선
        const kakaoBook = await getKakaoBookByIsbn(externalId)
        if (kakaoBook) {
          return { id: externalId, metadata: kakaoBook.metadata }
        }
        const googleBook = await getGoogleBookByIsbn(externalId)
        if (googleBook) {
          return { id: externalId, metadata: googleBook.metadata }
        }
      }

      return { id: externalId, metadata: null }
    }
    case 'VIDEO': {
      const video = await getVideoById(externalId)
      return { id: externalId, metadata: video?.metadata || null, subtype: video?.subtype }
    }
    case 'GAME': {
      const game = await getGameById(externalId)
      return { id: externalId, metadata: game?.metadata || null }
    }
    case 'MUSIC': {
      const album = await getAlbumById(externalId)
      return { id: externalId, metadata: album?.metadata || null }
    }
    default:
      return { id: externalId, metadata: null }
  }
}

// 캐시된 메타데이터 조회 (1시간 캐싱)
const getCachedMetadata = unstable_cache(
  fetchMetadataFromApi,
  ['content-metadata'],
  { revalidate: STATIC_REVALIDATE }
)

// 단일 콘텐츠 metadata 조회
// externalId: 외부 API 식별자 (ISBN, tmdb-movie-123 등)
export async function fetchContentMetadata(
  externalId: string,
  type: ContentType,
  externalSource?: string
): Promise<ContentMetadata> {
  try {
    return await getCachedMetadata(externalId, type, externalSource)
  } catch (error) {
    console.error(`[fetchContentMetadata] ${type} ${externalId} 에러:`, error)
    return { id: externalId, metadata: null }
  }
}
