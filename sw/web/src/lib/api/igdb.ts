// IGDB API 래퍼 (게임)
// API 문서: https://api-docs.igdb.com/

const TWITCH_CLIENT_ID = process.env.TWITCH_CLIENT_ID
const TWITCH_CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET
const IGDB_BASE_URL = 'https://api.igdb.com/v4'

// 토큰 캐시
let accessToken: string | null = null
let tokenExpiry: number = 0

// Twitch OAuth 토큰 발급
async function getAccessToken(): Promise<string> {
  // 캐시된 토큰이 유효하면 재사용
  if (accessToken && Date.now() < tokenExpiry) {
    return accessToken
  }

  if (!TWITCH_CLIENT_ID || !TWITCH_CLIENT_SECRET) {
    throw new Error('IGDB API 키가 설정되지 않았습니다. .env 파일에 TWITCH_CLIENT_ID와 TWITCH_CLIENT_SECRET을 설정해주세요.')
  }

  const response = await fetch(
    `https://id.twitch.tv/oauth2/token?client_id=${TWITCH_CLIENT_ID}&client_secret=${TWITCH_CLIENT_SECRET}&grant_type=client_credentials`,
    { method: 'POST' }
  )

  if (!response.ok) {
    throw new Error(`Twitch 토큰 발급 실패: ${response.status}`)
  }

  const data = await response.json()
  accessToken = data.access_token
  // 만료 5분 전에 갱신하도록 설정
  tokenExpiry = Date.now() + (data.expires_in - 300) * 1000

  return accessToken!
}

interface IGDBGame {
  id: number
  name: string
  slug: string
  summary?: string
  first_release_date?: number
  cover?: {
    id: number
    image_id: string
  }
  genres?: { id: number; name: string }[]
  platforms?: { id: number; name: string }[]
  involved_companies?: {
    id: number
    company: { id: number; name: string }
    developer: boolean
    publisher: boolean
  }[]
  rating?: number
  aggregated_rating?: number
  total_rating?: number
}

export interface GameSearchResult {
  externalId: string
  externalSource: 'igdb'
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
  const token = await getAccessToken()
  const offset = (page - 1) * limit

  // IGDB는 Apicalypse 쿼리 언어 사용
  const body = `
    search "${query}";
    fields name, slug, summary, first_release_date,
           cover.image_id,
           genres.name,
           platforms.name,
           involved_companies.company.name,
           involved_companies.developer,
           involved_companies.publisher,
           rating, aggregated_rating, total_rating;
    limit ${limit};
    offset ${offset};
  `

  const response = await fetch(`${IGDB_BASE_URL}/games`, {
    method: 'POST',
    headers: {
      'Client-ID': TWITCH_CLIENT_ID!,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'text/plain',
    },
    body,
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`IGDB API 오류: ${response.status} - ${errorText}`)
  }

  const data: IGDBGame[] = await response.json()

  const items: GameSearchResult[] = data.map((game) => {
    // 개발사/퍼블리셔 찾기
    const developer = game.involved_companies?.find(c => c.developer)?.company.name || ''
    const publisher = game.involved_companies?.find(c => c.publisher)?.company.name || ''

    // 커버 이미지 URL 생성 (t_cover_big = 264x374)
    const coverUrl = game.cover?.image_id
      ? `https://images.igdb.com/igdb/image/upload/t_cover_big/${game.cover.image_id}.jpg`
      : null

    // 출시일 변환 (Unix timestamp -> YYYY-MM-DD)
    const releaseDate = game.first_release_date
      ? new Date(game.first_release_date * 1000).toISOString().split('T')[0]
      : ''

    // 평점 (0-100 스케일)
    const rating = game.total_rating || game.aggregated_rating || game.rating || null

    return {
      externalId: `igdb-${game.id}`,
      externalSource: 'igdb' as const,
      category: 'game' as const,
      title: game.name,
      creator: developer || publisher,
      coverImageUrl: coverUrl,
      metadata: {
        summary: game.summary || '',
        releaseDate,
        genres: game.genres?.map(g => g.name) || [],
        platforms: game.platforms?.map(p => p.name) || [],
        rating: rating ? Math.round(rating) : null,
        developer,
        publisher,
      },
    }
  })

  // IGDB는 총 개수를 직접 반환하지 않음, 추정
  return {
    items,
    total: items.length < limit ? offset + items.length : offset + limit + 1,
    hasMore: items.length === limit,
  }
}

// 게임 상세 정보
export async function getGameDetails(gameId: number): Promise<{
  description: string
  developer: string
  publisher: string
} | null> {
  try {
    const token = await getAccessToken()

    const body = `
      fields summary,
             involved_companies.company.name,
             involved_companies.developer,
             involved_companies.publisher;
      where id = ${gameId};
    `

    const response = await fetch(`${IGDB_BASE_URL}/games`, {
      method: 'POST',
      headers: {
        'Client-ID': TWITCH_CLIENT_ID!,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'text/plain',
      },
      body,
    })

    if (!response.ok) return null

    const data: IGDBGame[] = await response.json()
    if (data.length === 0) return null

    const game = data[0]
    const developer = game.involved_companies?.find(c => c.developer)?.company.name || ''
    const publisher = game.involved_companies?.find(c => c.publisher)?.company.name || ''

    return {
      description: game.summary || '',
      developer,
      publisher,
    }
  } catch {
    return null
  }
}
