'use server'

import { unstable_cache } from 'next/cache'
import { searchBooks } from '@feelnnote/content-search/naver-books'
import { getVideoById } from '@feelnnote/content-search/tmdb'
import { getGameById } from '@feelnnote/content-search/igdb'
import { getAlbumById } from '@feelnnote/content-search/spotify'
import type { ContentType } from '@/types/database'

export interface ContentMetadata {
  id: string
  metadata: Record<string, unknown> | null
  subtype?: string
}

// 외부 API에서 메타데이터 조회 (내부 함수)
async function fetchMetadataFromApi(
  id: string,
  type: ContentType
): Promise<ContentMetadata> {
  switch (type) {
    case 'BOOK': {
      const result = await searchBooks(id, 1)
      const book = result.items.find(b => b.externalId === id)
      return { id, metadata: book?.metadata || null }
    }
    case 'VIDEO': {
      const video = await getVideoById(id)
      return { id, metadata: video?.metadata || null, subtype: video?.subtype }
    }
    case 'GAME': {
      const game = await getGameById(id)
      return { id, metadata: game?.metadata || null }
    }
    case 'MUSIC': {
      const album = await getAlbumById(id)
      return { id, metadata: album?.metadata || null }
    }
    case 'CERTIFICATE':
      return { id, metadata: null }
    default:
      return { id, metadata: null }
  }
}

// 캐시된 메타데이터 조회 (1시간 캐싱)
const getCachedMetadata = unstable_cache(
  fetchMetadataFromApi,
  ['content-metadata'],
  { revalidate: 3600 }
)

// 단일 콘텐츠 metadata 조회
export async function fetchContentMetadata(
  id: string,
  type: ContentType
): Promise<ContentMetadata> {
  try {
    return await getCachedMetadata(id, type)
  } catch (error) {
    console.error(`[fetchContentMetadata] ${type} ${id} 에러:`, error)
    return { id, metadata: null }
  }
}

// 여러 콘텐츠 metadata 일괄 조회
export async function fetchContentsMetadata(
  items: Array<{ id: string; type: ContentType }>
): Promise<Map<string, ContentMetadata>> {
  const results = await Promise.allSettled(
    items.map(item => fetchContentMetadata(item.id, item.type))
  )

  const metadataMap = new Map<string, ContentMetadata>()

  results.forEach((result, index) => {
    if (result.status === 'fulfilled' && result.value.metadata) {
      metadataMap.set(items[index].id, result.value)
    }
  })

  return metadataMap
}
