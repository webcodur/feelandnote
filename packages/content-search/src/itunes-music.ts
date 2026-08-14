// Apple iTunes Search API 음악 검색 래퍼 — MUSIC 메타의 유일한 출처.
//
// 인증·키가 없는 공개 창구라 IP 단위 속도 제한만 있다. 대량 조회는 막히므로
// 인물당 몇 건 수준의 신규 등록에만 쓴다(실측: 26.08.01 대량 재수집이 403으로 차단).
//
// 30초 미리듣기 음원(previewUrl)을 함께 주며, 우리 플레이어가 이 파일을 직접 재생한다.
// 상세: docs/project/platform/external-services.md 「외부 콘텐츠 검색 API」

const ITUNES_SEARCH_URL = 'https://itunes.apple.com/search'
const ITUNES_LOOKUP_URL = 'https://itunes.apple.com/lookup'

interface ItunesTrack {
  trackId?: number
  collectionId?: number
  trackName?: string
  collectionName?: string
  artistName: string
  artworkUrl100?: string
  artworkUrl60?: string
  previewUrl?: string
  releaseDate?: string
  primaryGenreName?: string
  trackCount?: number
  collectionViewUrl?: string
  trackViewUrl?: string
  wrapperType?: string
  kind?: string
}

interface PlayableItunesTrack extends ItunesTrack {
  trackId: number
  previewUrl: string
}

export interface ItunesMusicResult {
  externalId: string
  externalSource: 'itunes'
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
    /** 30초 미리듣기 음원. 플레이어가 직접 재생한다 */
    previewUrl: string | null
    /** 애플 뮤직 웹 페이지 */
    itunesUrl: string
    genre: string
  }
}

export type MusicSearchResult = ItunesMusicResult

/** 표지를 원하는 크기로. 아이튠즈는 URL의 치수 부분만 바꾸면 된다 */
function artwork(track: ItunesTrack, size = 600): string | null {
  const url = track.artworkUrl100 || track.artworkUrl60
  if (!url) return null
  return url.replace(/\/\d+x\d+bb\.(jpg|png)$/, `/${size}x${size}bb.$1`)
}

function isPlayableTrack(track: ItunesTrack): track is PlayableItunesTrack {
  return typeof track.trackId === 'number'
    && typeof track.previewUrl === 'string'
    && track.previewUrl.length > 0
}

function toResult(t: PlayableItunesTrack): ItunesMusicResult {
  return {
    externalId: `itunes-${t.trackId}`,
    externalSource: 'itunes',
    category: 'music',
    title: (t.trackName || '').trim(),
    creator: t.artistName || '',
    coverImageUrl: artwork(t),
    metadata: {
      summary: '',
      releaseDate: (t.releaseDate || '').slice(0, 10),
      albumType: 'track',
      totalTracks: t.trackCount ?? 0,
      artists: t.artistName ? [t.artistName] : [],
      previewUrl: t.previewUrl,
      itunesUrl: t.trackViewUrl || t.collectionViewUrl || '',
      genre: t.primaryGenreName || '',
    },
  }
}

function toAlbumResult(collection: ItunesTrack, previewTrack: PlayableItunesTrack): ItunesMusicResult | null {
  if (typeof collection.collectionId !== 'number') return null
  return {
    externalId: `itunes-${collection.collectionId}`,
    externalSource: 'itunes',
    category: 'music',
    title: (collection.collectionName || '').trim(),
    creator: collection.artistName || '',
    coverImageUrl: artwork(collection),
    metadata: {
      summary: '',
      releaseDate: (collection.releaseDate || '').slice(0, 10),
      albumType: 'album',
      totalTracks: collection.trackCount ?? 0,
      artists: collection.artistName ? [collection.artistName] : [],
      previewUrl: previewTrack.previewUrl,
      itunesUrl: collection.collectionViewUrl || '',
      genre: collection.primaryGenreName || '',
    },
  }
}

async function call(url: string): Promise<ItunesTrack[]> {
  const res = await fetch(url, { headers: { 'User-Agent': 'feelandnote/1.0' } })
  if (res.status === 403 || res.status === 429) {
    // 조용히 빈 배열을 돌려주면 "결과 없음"으로 오인된다. 반드시 드러낸다.
    throw new Error(`아이튠즈 속도 제한(${res.status}) — 잠시 후 다시 시도해야 한다`)
  }
  if (!res.ok) {
    throw new Error(`아이튠즈 API 오류: ${res.status}`)
  }
  const data = await res.json()
  return data.results || []
}

/**
 * 음악 검색.
 *
 * 한국 스토어는 아티스트명을 한국어로 돌려주므로(Nirvana→너바나) 국내 음원은 KR이,
 * 해외 음원은 US가 정확하다. 검색어에 한글이 있으면 KR을 먼저 본다.
 */
export async function searchMusic(
  query: string,
  page: number = 1,
  limit: number = 20
): Promise<{ items: ItunesMusicResult[]; total: number; hasMore: boolean }> {
  const hasKorean = /[가-힣]/.test(query)
  const countries = hasKorean ? ['KR', 'US'] : ['US', 'KR']
  const offset = (page - 1) * limit

  for (const country of countries) {
    const params = new URLSearchParams({
      term: query,
      entity: 'song',
      limit: String(Math.min(limit + offset, 200)),
      country,
    })
    const results = (await call(`${ITUNES_SEARCH_URL}?${params}`)).filter(isPlayableTrack)
    if (results.length) {
      const items = results.slice(offset, offset + limit).map(toResult)
      return { items, total: results.length, hasMore: results.length > offset + limit }
    }
  }
  return { items: [], total: 0, hasMore: false }
}

/** 아이튠즈 식별자로 단건 조회. `itunes-123` 형태와 숫자 모두 받는다 */
export async function getTrackById(externalId: string): Promise<ItunesMusicResult | null> {
  const id = externalId.replace(/^itunes[-_]/, '')
  if (!/^\d+$/.test(id)) return null

  for (const country of ['US', 'KR']) {
    const results = await call(`${ITUNES_LOOKUP_URL}?id=${id}&entity=song&country=${country}&limit=200`)
    const directTrack = results.find((result) => result.trackId === Number(id) && isPlayableTrack(result))
    if (directTrack && isPlayableTrack(directTrack)) return toResult(directTrack)

    const collection = results.find((result) => (
      result.wrapperType === 'collection' && result.collectionId === Number(id)
    ))
    const previewTrack = results.find((result) => (
      result.collectionId === Number(id) && isPlayableTrack(result)
    ))
    if (collection && previewTrack && isPlayableTrack(previewTrack)) {
      return toAlbumResult(collection, previewTrack)
    }
  }
  return null
}

/** 재생용 미리듣기 주소만 필요할 때 */
export async function getPreviewUrl(externalId: string): Promise<string | null> {
  const track = await getTrackById(externalId)
  return track?.metadata.previewUrl ?? null
}
