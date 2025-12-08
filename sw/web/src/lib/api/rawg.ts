// RAWG API 래퍼 (게임)
// API 문서: https://rawg.io/apidocs

const RAWG_API_KEY = process.env.RAWG_API_KEY
const RAWG_BASE_URL = 'https://api.rawg.io/api'

interface RAWGGame {
  id: number
  name: string
  slug: string
  background_image: string | null
  released: string | null
  rating: number
  ratings_count: number
  metacritic: number | null
  genres: { id: number; name: string }[]
  platforms: { platform: { id: number; name: string } }[]
  developers?: { id: number; name: string }[]
  publishers?: { id: number; name: string }[]
  description_raw?: string
}

interface RAWGSearchResponse {
  count: number
  next: string | null
  previous: string | null
  results: RAWGGame[]
}

export interface GameSearchResult {
  externalId: string
  externalSource: 'rawg'
  category: 'game'
  title: string
  creator: string
  coverImageUrl: string | null
  metadata: {
    summary: string
    releaseDate: string
    genres: string[]
    platforms: string[]
    rating: number | null
    developer: string
    publisher: string
  }
}

export async function searchGames(
  query: string,
  page: number = 1,
  limit: number = 20
): Promise<{
  items: GameSearchResult[]
  total: number
  hasMore: boolean
}> {
  if (!RAWG_API_KEY) {
    throw new Error('RAWG API 키가 설정되지 않았습니다. .env 파일에 RAWG_API_KEY를 설정해주세요.')
  }

  const params = new URLSearchParams({
    key: RAWG_API_KEY,
    search: query,
    page: String(page),
    page_size: String(limit),
  })

  const response = await fetch(`${RAWG_BASE_URL}/games?${params}`)

  if (!response.ok) {
    throw new Error(`RAWG API 오류: ${response.status}`)
  }

  const data: RAWGSearchResponse = await response.json()

  const items: GameSearchResult[] = data.results.map((game) => ({
    externalId: `rawg-${game.id}`,
    externalSource: 'rawg' as const,
    category: 'game' as const,
    title: game.name,
    creator: game.developers?.[0]?.name || game.publishers?.[0]?.name || '',
    coverImageUrl: game.background_image,
    metadata: {
      summary: '',
      releaseDate: game.released || '',
      genres: game.genres?.map((g) => g.name) || [],
      platforms: game.platforms?.map((p) => p.platform.name) || [],
      rating: game.metacritic || (game.rating ? Math.round(game.rating * 20) : null),
      developer: game.developers?.[0]?.name || '',
      publisher: game.publishers?.[0]?.name || '',
    },
  }))

  return {
    items,
    total: data.count,
    hasMore: data.next !== null,
  }
}

// 게임 상세 정보 (설명 포함)
export async function getGameDetails(gameId: number): Promise<{
  description: string
  developer: string
  publisher: string
} | null> {
  if (!RAWG_API_KEY) return null

  try {
    const response = await fetch(
      `${RAWG_BASE_URL}/games/${gameId}?key=${RAWG_API_KEY}`
    )

    if (!response.ok) return null

    const data: RAWGGame = await response.json()

    return {
      description: data.description_raw || '',
      developer: data.developers?.[0]?.name || '',
      publisher: data.publishers?.[0]?.name || '',
    }
  } catch {
    return null
  }
}
