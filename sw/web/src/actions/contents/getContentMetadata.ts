'use server'

import type { ContentType } from '@/types/database'
import type { ContentMetadata } from '@/types/content'

export type { ContentMetadata }

interface GetMetadataParams {
  contentId: string
  contentType: ContentType
}

// 콘텐츠 ID에서 API ID 추출
function parseContentId(contentId: string): { source: string; id: string; subtype?: string } {
  if (contentId.startsWith('tmdb-movie-')) {
    return { source: 'tmdb', id: contentId.replace('tmdb-movie-', ''), subtype: 'movie' }
  }
  if (contentId.startsWith('tmdb-tv-')) {
    return { source: 'tmdb', id: contentId.replace('tmdb-tv-', ''), subtype: 'tv' }
  }
  if (contentId.startsWith('igdb-')) {
    return { source: 'igdb', id: contentId.replace('igdb-', '') }
  }
  if (contentId.startsWith('spotify-')) {
    return { source: 'spotify', id: contentId.replace('spotify-', '') }
  }
  if (contentId.startsWith('qnet-')) {
    return { source: 'qnet', id: contentId.replace('qnet-', '') }
  }
  // ISBN or unknown format
  return { source: 'naver', id: contentId }
}

export async function getContentMetadata({ contentId, contentType }: GetMetadataParams): Promise<ContentMetadata | null> {
  try {
    const parsed = parseContentId(contentId)

    switch (contentType) {
      case 'BOOK':
        return await fetchBookMetadata(parsed.id)
      case 'VIDEO':
        return await fetchVideoMetadata(parsed.id, parsed.subtype as 'movie' | 'tv')
      case 'GAME':
        return await fetchGameMetadata(parsed.id)
      case 'MUSIC':
        return await fetchMusicMetadata(parsed.id)
      case 'CERTIFICATE':
        return await fetchCertificateMetadata(parsed.id)
      default:
        return null
    }
  } catch (error) {
    console.error('메타데이터 조회 실패:', error)
    return null
  }
}

// #region 책 메타데이터
async function fetchBookMetadata(isbn: string): Promise<ContentMetadata | null> {
  const clientId = process.env.NAVER_CLIENT_ID
  const clientSecret = process.env.NAVER_CLIENT_SECRET

  if (!clientId || !clientSecret) return null

  const params = new URLSearchParams({ d_isbn: isbn })
  const response = await fetch(`https://openapi.naver.com/v1/search/book_adv.json?${params}`, {
    headers: {
      'X-Naver-Client-Id': clientId,
      'X-Naver-Client-Secret': clientSecret,
    },
  })

  if (!response.ok) return null

  const data = await response.json()
  const book = data.items?.[0]
  if (!book) return null

  return {
    publisher: book.publisher,
    isbn: book.isbn,
  }
}
// #endregion

// #region 영상 메타데이터
const MOVIE_GENRES: Record<number, string> = {
  28: '액션', 12: '모험', 16: '애니메이션', 35: '코미디', 80: '범죄',
  99: '다큐멘터리', 18: '드라마', 10751: '가족', 14: '판타지', 36: '역사',
  27: '공포', 10402: '음악', 9648: '미스터리', 10749: '로맨스', 878: 'SF',
  10770: 'TV 영화', 53: '스릴러', 10752: '전쟁', 37: '서부',
}

const TV_GENRES: Record<number, string> = {
  10759: '액션 & 어드벤처', 16: '애니메이션', 35: '코미디', 80: '범죄',
  99: '다큐멘터리', 18: '드라마', 10751: '가족', 10762: '키즈', 9648: '미스터리',
  10763: '뉴스', 10764: '리얼리티', 10765: 'SF & 판타지', 10766: '연속극',
  10767: '토크', 10768: '전쟁 & 정치', 37: '서부',
}

async function fetchVideoMetadata(id: string, subtype?: 'movie' | 'tv'): Promise<ContentMetadata | null> {
  const apiKey = process.env.TMDB_API_KEY
  if (!apiKey) return null

  const mediaType = subtype || 'movie'
  const params = new URLSearchParams({ api_key: apiKey, language: 'ko-KR' })
  const response = await fetch(`https://api.themoviedb.org/3/${mediaType}/${id}?${params}`)

  if (!response.ok) return null

  const data = await response.json()
  const genreMap = mediaType === 'movie' ? MOVIE_GENRES : TV_GENRES

  return {
    subtype: mediaType,
    voteAverage: data.vote_average,
    genres: data.genres?.map((g: { id: number; name: string }) => genreMap[g.id] || g.name) || [],
  }
}
// #endregion

// #region 게임 메타데이터
let igdbToken: string | null = null
let igdbTokenExpiry = 0

async function getIgdbToken(): Promise<string | null> {
  if (igdbToken && Date.now() < igdbTokenExpiry) return igdbToken

  const clientId = process.env.TWITCH_CLIENT_ID
  const clientSecret = process.env.TWITCH_CLIENT_SECRET
  if (!clientId || !clientSecret) return null

  const response = await fetch(
    `https://id.twitch.tv/oauth2/token?client_id=${clientId}&client_secret=${clientSecret}&grant_type=client_credentials`,
    { method: 'POST' }
  )

  if (!response.ok) return null

  const data = await response.json()
  igdbToken = data.access_token
  igdbTokenExpiry = Date.now() + (data.expires_in - 300) * 1000

  return igdbToken
}

async function fetchGameMetadata(id: string): Promise<ContentMetadata | null> {
  const token = await getIgdbToken()
  const clientId = process.env.TWITCH_CLIENT_ID
  if (!token || !clientId) return null

  const response = await fetch('https://api.igdb.com/v4/games', {
    method: 'POST',
    headers: {
      'Client-ID': clientId,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'text/plain',
    },
    body: `
      fields rating, aggregated_rating, total_rating,
             genres.name, platforms.name,
             involved_companies.company.name, involved_companies.developer, involved_companies.publisher;
      where id = ${id};
    `,
  })

  if (!response.ok) return null

  const data = await response.json()
  const game = data[0]
  if (!game) return null

  const developer = game.involved_companies?.find((c: { developer: boolean }) => c.developer)?.company?.name
  const rating = game.total_rating || game.aggregated_rating || game.rating

  return {
    developer,
    rating: rating ? Math.round(rating) : undefined,
    platforms: game.platforms?.map((p: { name: string }) => p.name) || [],
    genres: game.genres?.map((g: { name: string }) => g.name) || [],
  }
}
// #endregion

// #region 음악 메타데이터
let spotifyToken: string | null = null
let spotifyTokenExpiry = 0

async function getSpotifyToken(): Promise<string | null> {
  if (spotifyToken && Date.now() < spotifyTokenExpiry) return spotifyToken

  const clientId = process.env.SPOTIFY_CLIENT_ID
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET
  if (!clientId || !clientSecret) return null

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })

  if (!response.ok) return null

  const data = await response.json()
  spotifyToken = data.access_token
  spotifyTokenExpiry = Date.now() + (data.expires_in - 300) * 1000

  return spotifyToken
}

async function fetchMusicMetadata(id: string): Promise<ContentMetadata | null> {
  const token = await getSpotifyToken()
  if (!token) return null

  const response = await fetch(`https://api.spotify.com/v1/albums/${id}?market=KR`, {
    headers: { 'Authorization': `Bearer ${token}` },
  })

  if (!response.ok) return null

  const album = await response.json()

  const albumTypeMap: Record<string, string> = {
    album: '정규앨범',
    single: '싱글',
    compilation: '컴필레이션',
  }

  return {
    albumType: albumTypeMap[album.album_type] || album.album_type,
    totalTracks: album.total_tracks,
    artists: album.artists?.map((a: { name: string }) => a.name) || [],
    spotifyUrl: album.external_urls?.spotify,
  }
}
// #endregion

// #region 자격증 메타데이터
const POPULAR_CERTIFICATES: Record<string, { field: string; series: string }> = {
  '1320': { field: '정보기술', series: '정보통신' },
  '2290': { field: '정보기술', series: '정보통신' },
  '6921': { field: '정보보호', series: '정보통신' },
  '1321': { field: '정보기술', series: '정보통신' },
  '7910': { field: '데이터', series: '정보통신' },
  '1350': { field: '전기', series: '전기전자' },
  '1351': { field: '전기', series: '전기전자' },
  '2170': { field: '건축', series: '건설' },
  '1110': { field: '토목', series: '건설' },
  '1560': { field: '사무자동화', series: '경영회계사무' },
  '1561': { field: '사무자동화', series: '경영회계사무' },
}

async function fetchCertificateMetadata(jmCode: string): Promise<ContentMetadata | null> {
  // Q-Net API는 개별 조회가 복잡하므로 로컬 데이터 사용
  const cert = POPULAR_CERTIFICATES[jmCode]

  return {
    qualificationType: '국가자격',
    series: cert?.series || '',
    majorField: cert?.field || '',
  }
}
// #endregion
