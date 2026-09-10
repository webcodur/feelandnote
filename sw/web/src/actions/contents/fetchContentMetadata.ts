'use server'

import { unstable_cache } from 'next/cache'
import { STATIC_REVALIDATE } from '@/lib/cache'
import { getVideoById } from '@feelandnote/content-search/tmdb'
import { getGameById } from '@feelandnote/content-search/igdb'
import { getTrackById } from '@feelandnote/content-search/itunes-music'
import type { ContentType } from '@/types/database'

export interface ContentMetadata {
  id: string
  metadata: Record<string, unknown> | null
  subtype?: string
  /** 실제로 응답을 돌려준 외부 출처. 요청 당시 DB 출처와 다를 수 있다. */
  source?: 'kakao_book' | 'google_books' | 'openlibrary' | 'tmdb' | 'igdb' | 'itunes'
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
    case 'BOOK':
      // BOOK 소개는 저장된 출처를 getBookIntroduction에 지정해서 조회한다.
      return { id: externalId, metadata: null }
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

// 도서 외 메타는 공통 정적 캐시 수명을 따른다.
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
  if (type === 'BOOK') return { id: externalId, metadata: null }
  try {
    return await getCachedMetadata(externalId, type, externalSource, locale)
  } catch (error) {
    console.error(`[fetchContentMetadata] ${type} ${externalId} 에러:`, error)
    return { id: externalId, metadata: null }
  }
}
