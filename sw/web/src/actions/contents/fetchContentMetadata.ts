'use server'

import { unstable_cache } from 'next/cache'
import { searchBooks as searchNaverBooks } from '@feelandnote/content-search/naver-books'
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
      if (externalSource === 'google_books') {
        // Google Books 소스 → Google Books 우선
        const googleBook = await getGoogleBookByIsbn(externalId)
        if (googleBook) {
          return { id: externalId, metadata: googleBook.metadata }
        }
        const naverResult = await searchNaverBooks(externalId, 1)
        const naverBook = naverResult.items.find(
          b => b.externalId === externalId || b.metadata.isbn === externalId
        )
        if (naverBook) {
          return { id: externalId, metadata: naverBook.metadata }
        }
      } else {
        // 네이버 소스(기본) → 네이버 우선
        const naverResult = await searchNaverBooks(externalId, 1)
        const naverBook = naverResult.items.find(
          b => b.externalId === externalId || b.metadata.isbn === externalId
        )
        if (naverBook) {
          return { id: externalId, metadata: naverBook.metadata }
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
    case 'CERTIFICATE':
      return { id: externalId, metadata: null }
    default:
      return { id: externalId, metadata: null }
  }
}

// 캐시된 메타데이터 조회 (1시간 캐싱)
const getCachedMetadata = unstable_cache(
  fetchMetadataFromApi,
  ['content-metadata'],
  { revalidate: 3600 }
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

// 여러 콘텐츠 metadata 일괄 조회
export async function fetchContentsMetadata(
  items: Array<{ externalId: string; type: ContentType }>
): Promise<Map<string, ContentMetadata>> {
  const results = await Promise.allSettled(
    items.map(item => fetchContentMetadata(item.externalId, item.type))
  )

  const metadataMap = new Map<string, ContentMetadata>()

  results.forEach((result, index) => {
    if (result.status === 'fulfilled' && result.value.metadata) {
      metadataMap.set(items[index].externalId, result.value)
    }
  })

  return metadataMap
}
