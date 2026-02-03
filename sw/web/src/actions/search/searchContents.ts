'use server'

import { searchBooks } from '@feelandnote/content-search/naver-books'
import { searchVideo } from '@feelandnote/content-search/tmdb'
import { searchGames } from '@feelandnote/content-search/igdb'
import { searchMusic } from '@feelandnote/content-search/spotify'
import { searchCertificates } from '@feelandnote/content-search/qnet'
import type { CategoryId } from '@/constants/categories'

export interface ContentSearchResult {
  id: string
  title: string
  creator: string
  category: string
  subtype?: string // video의 경우 movie | tv
  thumbnail?: string
  description?: string
  releaseDate?: string
  externalId?: string
  metadata?: Record<string, unknown> // 원본 metadata (콘텐츠 추가용)
}

interface SearchContentsParams {
  query: string
  category?: CategoryId
  page?: number
  limit?: number
}

interface SearchContentsResponse {
  items: ContentSearchResult[]
  total: number
  hasMore: boolean
}

export async function searchContents({
  query,
  category = 'book',
  page = 1,
}: SearchContentsParams): Promise<SearchContentsResponse> {
  if (!query.trim()) {
    return { items: [], total: 0, hasMore: false }
  }

  try {
    switch (category) {
      case 'book': {
        const bookResults = await searchBooks(query, page)
        return {
          items: bookResults.items.map((book) => ({
            id: book.externalId,
            title: book.title,
            creator: book.creator,
            category: 'book',
            thumbnail: book.coverImageUrl || undefined,
            description: book.metadata.description,
            releaseDate: book.metadata.publishDate,
            externalId: book.externalId,
            metadata: book.metadata,
          })),
          total: bookResults.total,
          hasMore: bookResults.hasMore,
        }
      }

      case 'video': {
        const videoResults = await searchVideo(query, page)
        return {
          items: videoResults.items.map((video) => ({
            id: video.externalId,
            title: video.title,
            creator: video.creator,
            category: 'video',
            subtype: video.subtype,
            thumbnail: video.coverImageUrl || undefined,
            description: video.metadata.overview,
            releaseDate: video.metadata.releaseDate,
            externalId: video.externalId,
            metadata: video.metadata,
          })),
          total: videoResults.total,
          hasMore: videoResults.hasMore,
        }
      }

      case 'game': {
        const gameResults = await searchGames(query, page)
        return {
          items: gameResults.items.map((game) => ({
            id: game.externalId,
            title: game.title,
            creator: game.creator,
            category: 'game',
            thumbnail: game.coverImageUrl || undefined,
            description: game.metadata.summary,
            releaseDate: game.metadata.releaseDate,
            externalId: game.externalId,
            metadata: game.metadata,
          })),
          total: gameResults.total,
          hasMore: gameResults.hasMore,
        }
      }

      case 'music': {
        const musicResults = await searchMusic(query, page)
        return {
          items: musicResults.items.map((music) => ({
            id: music.externalId,
            title: music.title,
            creator: music.creator,
            category: 'music',
            thumbnail: music.coverImageUrl || undefined,
            description: `${music.metadata.albumType} | ${music.metadata.totalTracks}곡`,
            releaseDate: music.metadata.releaseDate,
            externalId: music.externalId,
            metadata: music.metadata,
          })),
          total: musicResults.total,
          hasMore: musicResults.hasMore,
        }
      }

      case 'certificate': {
        const certResults = await searchCertificates(query, page)
        return {
          items: certResults.items.map((cert) => ({
            id: cert.externalId,
            title: cert.title,
            creator: cert.creator,
            category: 'certificate',
            thumbnail: undefined,
            description: `${cert.metadata.qualificationType} | ${cert.metadata.series}`,
            externalId: cert.externalId,
            metadata: cert.metadata,
          })),
          total: certResults.total,
          hasMore: certResults.hasMore,
        }
      }

      default:
        return { items: [], total: 0, hasMore: false }
    }
  } catch (error) {
    console.error(`${category} 검색 에러:`, error)
    return { items: [], total: 0, hasMore: false }
  }
}
