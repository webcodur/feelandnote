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
    { method: 'POST', signal: AbortSignal.timeout(8000) }
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

export interface IGDBStoreGame {
  id: number
  name: string
  alternative_names?: { name: string }[]
  game_localizations?: { name: string; region?: { name: string } }[]
  platforms?: { name: string }[]
  websites?: { url: string }[]
  external_games?: { uid: string; url?: string; external_game_source?: { name: string } }[]
  version_parent?: number
  version_title?: string
  parent_game?: number
  ports?: IGDBStoreGame[]
  remasters?: IGDBStoreGame[]
  remakes?: IGDBStoreGame[]
  bundles?: IGDBStoreGame[]
  expanded_games?: IGDBStoreGame[]
}

// Steam 차트 → 공통 판매처 조회. 제목 검색 없이 외부 서비스 ID가 하나의 작품을 가리킬 때만 연결한다.
export async function getGameIdFromSteam(appId: number): Promise<number | null> {
  if (!Number.isSafeInteger(appId) || appId <= 0) return null
  const token = await getAccessToken()
  const response = await fetch(`${IGDB_BASE_URL}/external_games`, {
    method: 'POST',
    headers: { 'Client-ID': TWITCH_CLIENT_ID!, Authorization: `Bearer ${token}`, 'Content-Type': 'text/plain' },
    body: `fields uid,game,external_game_source.name; where uid = "${appId}" & external_game_source.name = "Steam"; limit 100;`,
    signal: AbortSignal.timeout(8000), cache: 'no-store',
  })
  if (!response.ok) throw new Error(`IGDB Steam identity lookup failed: ${response.status}`)
  const entries = await response.json()
  if (!Array.isArray(entries) || entries.length >= 100) return null
  const ids = [...new Set<number>(entries.filter(entry => entry.uid === String(appId)
    && entry.external_game_source?.name === 'Steam' && Number.isSafeInteger(entry.game) && entry.game > 0)
    .map(entry => entry.game))]
  return ids.length === 1 ? ids[0] : null
}

// 판매처 연결은 저장 ID와 명시된 판본 관계로 조회한다. 제목 검색으로 다른 게임을 대체하지 않는다.
export async function getGameStoreReferences(gameId: number): Promise<IGDBStoreGame | null> {
  if (!Number.isSafeInteger(gameId) || gameId <= 0) return null
  const token = await getAccessToken()
  const fields = ['name', 'alternative_names.name', 'game_localizations.name', 'game_localizations.region.name', 'platforms.name', 'websites.url', 'external_games.uid',
    'external_games.url', 'external_games.external_game_source.name', 'version_parent', 'version_title', 'parent_game']
  const relationFields = ['ports', 'remasters', 'remakes', 'bundles'].flatMap(relation => fields.map(field => `${relation}.${field}`))
  const collectionFields = ['ports', 'remasters', 'remakes'].flatMap(relation => fields.map(field => `${relation}.bundles.${field}`))
  // 원작과 PC 확장판이 별도 항목이면 리마스터가 확장판에만 연결되기도 한다.
  const expandedFields = [...fields, ...['ports', 'remasters', 'remakes'].flatMap(relation =>
    fields.map(field => `${relation}.${field}`))].map(field => `expanded_games.${field}`)
  const response = await fetch(`${IGDB_BASE_URL}/games`, {
    method: 'POST',
    headers: { 'Client-ID': TWITCH_CLIENT_ID!, Authorization: `Bearer ${token}`, 'Content-Type': 'text/plain' },
    body: `fields ${[...fields, ...relationFields, ...collectionFields, ...expandedFields].join(',')}; where id = ${gameId};`,
    signal: AbortSignal.timeout(8000),
    cache: 'no-store',
  })
  if (!response.ok) throw new Error(`IGDB store lookup failed: ${response.status}`)
  const games = await response.json()
  const game = Array.isArray(games) ? games.find((entry) => entry.id === gameId) : null
  return game && typeof game.name === 'string' ? game : null
}

interface IGDBGame {
  id: number
  name: string
  slug: string
  summary?: string
  storyline?: string
  first_release_date?: number
  cover?: {
    id: number
    image_id: string
  }
  screenshots?: {
    id: number
    image_id: string
  }[]
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
    // 추가 상세 정보 (getGameById에서만 제공)
    storyline?: string
    screenshots?: string[]
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

// YouTube 게임 트레일러 키 조회
export async function getGameTrailer(externalId: string): Promise<string | null> {
  // igdb-123, igdb_123 모두 지원
  const match = externalId.match(/^igdb[_-](\d+)$/)
  if (!match) return null

  try {
    const token = await getAccessToken()

    const body = `fields videos.video_id; where id = ${match[1]};`
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

    const data = await response.json()
    if (!data[0]?.videos?.length) return null

    return data[0].videos[0].video_id as string
  } catch {
    return null
  }
}

// ID로 게임 정보 조회 (metadata 포함 - 상세 정보 강화)
export async function getGameById(externalId: string): Promise<GameSearchResult | null> {
  // externalId 형식: igdb-123
  const match = externalId.match(/^igdb-(\d+)$/)
  if (!match) return null

  const gameId = match[1]

  try {
    const token = await getAccessToken()

    const body = `
      fields name, slug, summary, storyline, first_release_date,
             cover.image_id,
             screenshots.image_id,
             genres.name,
             platforms.name,
             involved_companies.company.name,
             involved_companies.developer,
             involved_companies.publisher,
             rating, aggregated_rating, total_rating;
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
    const coverUrl = game.cover?.image_id
      ? `https://images.igdb.com/igdb/image/upload/t_cover_big/${game.cover.image_id}.jpg`
      : null
    const releaseDate = game.first_release_date
      ? new Date(game.first_release_date * 1000).toISOString().split('T')[0]
      : ''
    const rating = game.total_rating || game.aggregated_rating || game.rating || null

    // 스크린샷 URL 생성 (상위 5개)
    const screenshots = game.screenshots?.slice(0, 5).map(
      s => `https://images.igdb.com/igdb/image/upload/t_screenshot_big/${s.image_id}.jpg`
    ) || []

    return {
      externalId,
      externalSource: 'igdb',
      category: 'game',
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
        // 추가 상세 정보
        storyline: game.storyline || undefined,
        screenshots: screenshots.length > 0 ? screenshots : undefined,
      },
    }
  } catch {
    return null
  }
}
