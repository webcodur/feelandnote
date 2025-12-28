'use server'

import { searchBooks } from '@/lib/api/naver-books'
import { searchVideo } from '@/lib/api/tmdb'
import { searchGames } from '@/lib/api/igdb'
import { searchMusic } from '@/lib/api/spotify'
import { searchCertificates } from '@/lib/api/qnet'
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
            subtype: video.subtype, // movie | tv
            thumbnail: video.coverImageUrl || undefined,
            description: video.metadata.overview,
            releaseDate: video.metadata.releaseDate,
            externalId: video.externalId,
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
            thumbnail: undefined, // 자격증은 썸네일 없음
            description: `${cert.metadata.qualificationType} | ${cert.metadata.series}`,
            externalId: cert.externalId,
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
