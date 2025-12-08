'use server'

import { searchBooks } from '@/lib/api/naver-books'
import { searchMovies, searchTVShows } from '@/lib/api/tmdb'
import { searchGames } from '@/lib/api/rawg'

export interface ContentSearchResult {
  id: string
  title: string
  creator: string
  category: string
  thumbnail?: string
  description?: string
  releaseDate?: string
  externalId?: string
}

interface SearchContentsParams {
  query: string
  category?: string
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
    // 카테고리별 단일 API 호출
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

      case 'movie': {
        const movieResults = await searchMovies(query, page)
        return {
          items: movieResults.items.map((movie) => ({
            id: movie.externalId,
            title: movie.title,
            creator: movie.creator,
            category: 'movie',
            thumbnail: movie.coverImageUrl || undefined,
            description: movie.metadata.overview,
            releaseDate: movie.metadata.releaseDate,
            externalId: movie.externalId,
          })),
          total: movieResults.total,
          hasMore: movieResults.hasMore,
        }
      }

      case 'drama': {
        const dramaResults = await searchTVShows(query, page)
        return {
          items: dramaResults.items.map((drama) => ({
            id: drama.externalId,
            title: drama.title,
            creator: drama.creator,
            category: 'drama',
            thumbnail: drama.coverImageUrl || undefined,
            description: drama.metadata.overview,
            releaseDate: drama.metadata.firstAirDate,
            externalId: drama.externalId,
          })),
          total: dramaResults.total,
          hasMore: dramaResults.hasMore,
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

      default:
        return { items: [], total: 0, hasMore: false }
    }
  } catch (error) {
    console.error(`${category} 검색 에러:`, error)
    return { items: [], total: 0, hasMore: false }
  }
}
