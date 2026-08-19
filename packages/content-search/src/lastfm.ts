// Last.fm 래퍼 — 음악 소개의 두 번째 무료 출처
//
// 앨범·곡 이름만으로 소개를 돌려준다. 키가 없으면 조용히 비활성이며 화면은 위키백과 탭만 보여준다.
// 돌아온 아티스트가 우리가 물은 아티스트와 다르면 버린다 — 같은 제목의 다른 곡이 딸려 오기 때문이다.

const LASTFM_API_KEY = process.env.LASTFM_API_KEY
const LASTFM_API_URL = 'https://ws.audioscrobbler.com/2.0/'
const REQUEST_TIMEOUT_MS = 8000

export interface LastfmIntro {
  text: string
  /** 사람이 열어 볼 원문 주소. 출처 표기에 쓴다 */
  url: string
  title: string
}

interface LastfmWiki {
  summary?: string
  content?: string
}

interface LastfmAlbumResponse {
  album?: { name?: string; artist?: string; url?: string; wiki?: LastfmWiki }
}

interface LastfmTrackResponse {
  track?: { name?: string; artist?: { name?: string }; url?: string; wiki?: LastfmWiki }
}

// NFKD는 한글을 자모로 분해해 완성형 필터가 지운다 — 분음부호만 떼고 NFC로 재조합한다
function normalize(value: string): string {
  return (value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .normalize('NFC')
    .replace(/[^a-z0-9가-힣]/g, '')
}

/** 협연·피처링이 붙으면 대표 아티스트만 남긴다 */
function cleanArtist(artist: string): string {
  return artist.split(/\s*(?:&|,|feat\.?|featuring|with)\s+/i)[0].trim()
}

/* 응답은 HTML 조각이고 끝에 "Read more on Last.fm" 안내가 붙는다. 화면은 평문을 그린다. */
function toPlainText(html: string): string {
  return html
    .replace(/<a\b[^>]*>\s*Read more on Last\.fm\s*<\/a>\s*\.?/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

async function callLastfm<T>(params: Record<string, string>): Promise<T | null> {
  if (!LASTFM_API_KEY) return null
  const query = new URLSearchParams({ ...params, api_key: LASTFM_API_KEY, format: 'json', autocorrect: '1' })
  try {
    const response = await fetch(`${LASTFM_API_URL}?${query}`, {
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
    if (!response.ok) return null
    return (await response.json()) as T
  } catch {
    return null
  }
}

function buildIntro(
  wiki: LastfmWiki | undefined,
  url: string | undefined,
  title: string | undefined,
  gotArtist: string | undefined,
  wantArtist: string,
): LastfmIntro | null {
  const raw = wiki?.summary || wiki?.content
  if (!raw) return null

  // 이름이 같은 다른 아티스트의 곡을 돌려주는 경우가 있다
  const got = normalize(gotArtist ?? '')
  const want = normalize(wantArtist)
  if (got && want && !got.includes(want) && !want.includes(got)) return null

  const text = toPlainText(raw)
  if (!text) return null
  return { text, url: url ?? '', title: title ?? '' }
}

/** 앨범 소개 */
export async function getAlbumIntro(
  artist: string,
  album: string,
  language = 'en',
): Promise<LastfmIntro | null> {
  const wantArtist = cleanArtist(artist)
  const data = await callLastfm<LastfmAlbumResponse>({
    method: 'album.getinfo',
    artist: wantArtist,
    album,
    lang: language,
  })
  return buildIntro(data?.album?.wiki, data?.album?.url, data?.album?.name, data?.album?.artist, wantArtist)
}

/** 곡 소개 */
export async function getTrackIntro(
  artist: string,
  track: string,
  language = 'en',
): Promise<LastfmIntro | null> {
  const wantArtist = cleanArtist(artist)
  const data = await callLastfm<LastfmTrackResponse>({
    method: 'track.getinfo',
    artist: wantArtist,
    track,
    lang: language,
  })
  return buildIntro(data?.track?.wiki, data?.track?.url, data?.track?.name, data?.track?.artist?.name, wantArtist)
}

/** 키가 없으면 화면에서 이 출처를 아예 감춘다 */
export function isLastfmEnabled(): boolean {
  return !!LASTFM_API_KEY
}
