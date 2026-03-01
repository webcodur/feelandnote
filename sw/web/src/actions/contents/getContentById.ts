'use server'

import { unstable_cache } from 'next/cache'
import { searchBooks } from '@feelandnote/content-search/naver-books'
import { getVideoById } from '@feelandnote/content-search/tmdb'
import { getGameById } from '@feelandnote/content-search/igdb'
import { getAlbumById } from '@feelandnote/content-search/spotify'
import type { CategoryId } from '@/constants/categories'

export interface ContentDetail {
  id: string
  title: string
  creator: string
  category: CategoryId
  subtype?: string
  thumbnail?: string
  description?: string
  releaseDate?: string
  metadata?: Record<string, unknown>
}

// 외부 API에서 콘텐츠 정보 조회 (내부 함수)
// externalId: 외부 API 식별자 (ISBN, tmdb-movie-123 등)
async function fetchContentFromApi(
  externalId: string,
  category: CategoryId
): Promise<ContentDetail | null> {
  switch (category) {
    case 'book': {
      const result = await searchBooks(externalId, 1)
      const book = result.items.find(b => b.externalId === externalId)
      if (!book) return null
      return {
        id: book.externalId,
        title: book.title,
        creator: book.creator,
        category: 'book',
        thumbnail: book.coverImageUrl || undefined,
        description: book.metadata.description,
        releaseDate: book.metadata.publishDate,
        metadata: book.metadata,
      }
    }

    case 'video': {
      const video = await getVideoById(externalId)
      if (!video) return null
      return {
        id: video.externalId,
        title: video.title,
        creator: video.creator,
        category: 'video',
        subtype: video.subtype,
        thumbnail: video.coverImageUrl || undefined,
        description: video.metadata.overview,
        releaseDate: video.metadata.releaseDate,
        metadata: video.metadata,
      }
    }

    case 'game': {
      const game = await getGameById(externalId)
      if (!game) return null
      return {
        id: game.externalId,
        title: game.title,
        creator: game.creator,
        category: 'game',
        thumbnail: game.coverImageUrl || undefined,
        description: game.metadata.summary,
        releaseDate: game.metadata.releaseDate,
        metadata: game.metadata,
      }
    }

    case 'music': {
      const album = await getAlbumById(externalId)
      if (!album) return null
      return {
        id: album.externalId,
        title: album.title,
        creator: album.creator,
        category: 'music',
        thumbnail: album.coverImageUrl || undefined,
        description: `${album.metadata.albumType} | ${album.metadata.totalTracks}곡`,
        releaseDate: album.metadata.releaseDate,
        metadata: album.metadata,
      }
    }

    case 'certificate':
      return null

    default:
      return null
  }
}

// 캐시된 콘텐츠 조회 (1시간 캐싱)
const getCachedContent = unstable_cache(
  fetchContentFromApi,
  ['content-detail'],
  { revalidate: 3600 }
)

// externalId와 카테고리로 외부 API에서 콘텐츠 정보 조회
export async function getContentById(
  externalId: string,
  category: CategoryId
): Promise<ContentDetail | null> {
  try {
    return await getCachedContent(externalId, category)
  } catch (error) {
    console.error(`[getContentById] ${category} ${externalId} 에러:`, error)
    return null
  }
}
