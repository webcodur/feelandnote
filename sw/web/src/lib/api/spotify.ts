// Spotify API 래퍼 (음악)
// API 문서: https://developer.spotify.com/documentation/web-api

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET
const SPOTIFY_BASE_URL = 'https://api.spotify.com/v1'

// 토큰 캐시
let accessToken: string | null = null
let tokenExpiry: number = 0

// Spotify OAuth 토큰 발급 (Client Credentials Flow)
async function getAccessToken(): Promise<string> {
  // 캐시된 토큰이 유효하면 재사용
  if (accessToken && Date.now() < tokenExpiry) {
    return accessToken
  }

  if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
    throw new Error('Spotify API 키가 설정되지 않았습니다. .env 파일에 SPOTIFY_CLIENT_ID와 SPOTIFY_CLIENT_SECRET을 설정해주세요.')
  }

  const credentials = Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64')

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })

  if (!response.ok) {
    throw new Error(`Spotify 토큰 발급 실패: ${response.status}`)
  }

  const data = await response.json()
  accessToken = data.access_token
  // 만료 5분 전에 갱신하도록 설정
  tokenExpiry = Date.now() + (data.expires_in - 300) * 1000

  return accessToken!
}

interface SpotifyAlbum {
  id: string
  name: string
  artists: { id: string; name: string }[]
  images: { url: string; height: number; width: number }[]
  release_date: string
  release_date_precision: 'year' | 'month' | 'day'
  total_tracks: number
  album_type: 'album' | 'single' | 'compilation'
  external_urls: { spotify: string }
}

interface SpotifySearchResponse {
  albums: {
    items: SpotifyAlbum[]
    total: number
    limit: number
    offset: number
    next: string | null
  }
}

export interface MusicSearchResult {
  externalId: string
  externalSource: 'spotify'
  category: 'music'
  title: string
  creator: string
  coverImageUrl: string | null
  metadata: {
    summary: string
    releaseDate: string
    albumType: string
    totalTracks: number
    artists: string[]
    spotifyUrl: string
  }
}

export async function searchMusic(
  query: string,
  page: number = 1,
  limit: number = 20
): Promise<{
  items: MusicSearchResult[]
  total: number
  hasMore: boolean
}> {
  const token = await getAccessToken()
  const offset = (page - 1) * limit

  const params = new URLSearchParams({
    q: query,
    type: 'album',
    market: 'KR',
    limit: String(limit),
    offset: String(offset),
  })

  const response = await fetch(`${SPOTIFY_BASE_URL}/search?${params}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Spotify API 오류: ${response.status} - ${errorText}`)
  }

  const data: SpotifySearchResponse = await response.json()

  const items: MusicSearchResult[] = data.albums.items.map((album) => {
    // 가장 큰 이미지 선택 (보통 첫 번째)
    const coverUrl = album.images[0]?.url || null

    // 아티스트명 조합
    const artistNames = album.artists.map((a) => a.name)
    const primaryArtist = artistNames[0] || ''

    // 앨범 타입 한글화
    const albumTypeMap: Record<string, string> = {
      album: '정규앨범',
      single: '싱글',
      compilation: '컴필레이션',
    }

    return {
      externalId: `spotify-${album.id}`,
      externalSource: 'spotify' as const,
      category: 'music' as const,
      title: album.name,
      creator: primaryArtist,
      coverImageUrl: coverUrl,
      metadata: {
        summary: '', // Spotify는 앨범 설명을 제공하지 않음
        releaseDate: album.release_date,
        albumType: albumTypeMap[album.album_type] || album.album_type,
        totalTracks: album.total_tracks,
        artists: artistNames,
        spotifyUrl: album.external_urls.spotify,
      },
    }
  })

  return {
    items,
    total: data.albums.total,
    hasMore: data.albums.next !== null,
  }
}

// 앨범 상세 정보 (트랙 목록 포함)
export async function getAlbumDetails(albumId: string): Promise<{
  tracks: { name: string; durationMs: number; trackNumber: number }[]
  label: string
  copyrights: string[]
} | null> {
  try {
    const token = await getAccessToken()

    const response = await fetch(`${SPOTIFY_BASE_URL}/albums/${albumId}?market=KR`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    })

    if (!response.ok) return null

    const data = await response.json()

    return {
      tracks: data.tracks.items.map((track: { name: string; duration_ms: number; track_number: number }) => ({
        name: track.name,
        durationMs: track.duration_ms,
        trackNumber: track.track_number,
      })),
      label: data.label || '',
      copyrights: data.copyrights?.map((c: { text: string }) => c.text) || [],
    }
  } catch {
    return null
  }
}
