'use server'

import { unstable_cache } from 'next/cache'
import { searchBooks } from '@feelandnote/content-search/kakao-books'
import { getVideoById } from '@feelandnote/content-search/tmdb'
import { getGameById } from '@feelandnote/content-search/igdb'
import { getTrackById } from '@feelandnote/content-search/itunes-music'
import type { CategoryId } from '@/constants/categories'
import { getLocale } from 'next-intl/server'
import { getBookSearchLanguage, type BookSearchLanguage } from '@feelandnote/content-search/book-search-language'
import { getEnglishBookResult } from '@/lib/books/bookSearch.server'

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
  externalSource?: string
}

// 외부 API에서 콘텐츠 정보 조회 (내부 함수)
// externalId: 외부 API 식별자 (ISBN, tmdb-movie-123 등)
async function fetchContentFromApi(
  externalId: string,
  category: CategoryId,
  bookLanguage: BookSearchLanguage,
): Promise<ContentDetail | null> {
  switch (category) {
    case 'book': {
      const book = bookLanguage === 'en'
        ? await getEnglishBookResult(externalId)
        : (await searchBooks(externalId, 1)).items.find(b => b.externalId === externalId)
      if (!book) return null
      return {
        id: book.externalId,
        title: book.title,
        creator: book.creator,
        category: 'book',
        thumbnail: book.coverImageUrl || undefined,
        description: book.metadata.description,
        releaseDate: book.metadata.publishDate || undefined,
        metadata: book.metadata,
        externalSource: book.externalSource,
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
      const track = await getTrackById(externalId)
      if (!track) return null
      return {
        id: track.externalId,
        title: track.title,
        creator: track.creator,
        category: 'music',
        thumbnail: track.coverImageUrl || undefined,
        description: track.metadata.genre || track.metadata.albumType,
        releaseDate: track.metadata.releaseDate,
        metadata: track.metadata,
      }
    }

    default:
      return null
  }
}

// 캐시된 콘텐츠 조회 (1시간 캐싱)
const getCachedContent = unstable_cache(
  fetchContentFromApi,
  ['content-detail-book-language-v2'],
  { revalidate: 3600 }
)

// externalId와 카테고리로 외부 API에서 콘텐츠 정보 조회
export async function getContentById(
  externalId: string,
  category: CategoryId,
  bookLanguage?: BookSearchLanguage,
): Promise<ContentDetail | null> {
  try {
    const language = bookLanguage ?? (category === 'book' ? getBookSearchLanguage(await getLocale()) : 'ko')
    return await getCachedContent(externalId, category, language)
  } catch (error) {
    console.error(`[getContentById] ${category} ${externalId} 에러:`, error)
    return null
  }
}
