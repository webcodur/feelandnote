// 위키백과 래퍼 — 음악 소개의 무료 출처
//
// iTunes는 음악 소개를 주지 않는다(트랙·앨범 응답에 설명 필드가 없다).
// 제목·아티스트만으로 문서를 찾으면 엉뚱한 문서가 딸려 오므로, 아래 규칙을 모두 통과한 문서만 쓴다.
// 규칙 없이 검색 1위를 그대로 쓰면 파데레프스키 음반에 쇼팽 소나타 설명이 붙는다(26.08.19 실측).

export interface WikipediaIntro {
  /** 문서 첫 문단 */
  text: string
  /** 사람이 열어 볼 원문 주소. CC BY-SA 표기에 쓴다 */
  url: string
  title: string
}

export type MusicUnit = 'album' | 'track'

const REQUEST_TIMEOUT_MS = 8000
const USER_AGENT = 'feelandnote/1.0 (https://feelandnote.com)'

/** 판·리마스터 표기는 위키 문서 제목에 없다 — 떼고 찾는다 */
const EDITION_NOTE =
  /\s*[([][^)\]]*(version|remaster|remix|deluxe|expanded|bonus|edition|excerpts|mono|stereo|anniversary|reissue|live|feat\.?|featuring)[^)\]]*[)\]]/gi

function cleanTitle(title: string): string {
  return title.replace(EDITION_NOTE, '').replace(/\s+-\s+(single|ep)$/i, '').trim()
}

/** 협연·피처링이 붙으면 대표 아티스트만 남긴다 */
function cleanArtist(artist: string): string {
  return artist.split(/\s*(?:&|,|·|feat\.?|featuring|with)\s*/i)[0].trim()
}

/*
  NFKD는 한글 음절을 자모로 분해해 완성형 필터가 전부 지워 버린다 — 한글 제목이 빈 문자열이 되면
  "빈 문자열 === 빈 문자열"로 모든 후보가 제목 검사를 통과한다(「양화대교」→자이언티 오답의 뿌리, 26.08.19).
  분음부호만 떼고 NFC로 재조합해 한글을 보존한다.
*/
function normalize(value: string): string {
  return (value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .normalize('NFC')
    .replace(/[^a-z0-9가-힣]/g, '')
}

/*
  클래식 음반은 "Mozart: Cosi Fan Tutte"처럼 작곡가를 앞에 달고 들어온다.
  위키 문서 제목은 작품명뿐이라 앞부분을 떼고 한 번 더 찾는다.
  앞부분이 그 작곡가일 때만 뗀다 — 밴드 이름까지 떼면 엉뚱한 문서로 간다.
*/
function withoutComposerPrefix(title: string, artist: string): string | null {
  const colon = title.indexOf(':')
  if (colon <= 0) return null
  const rest = title.slice(colon + 1).trim()
  if (rest.length < 3) return null
  const surname = normalize(title.slice(0, colon).trim().split(/\s+/).pop() ?? '')
  if (surname.length < 3) return null
  return normalize(artist).includes(surname) ? rest : null
}

/** 앨범/노래/작곡 계열 위키데이터 유형 */
const WORK_TYPES = new Set([
  'Q482994', 'Q7366', 'Q105543609', 'Q208569', 'Q134556', 'Q169930', 'Q2031291', 'Q217199', 'Q222910',
])
const CREATOR_PROPS = ['P175', 'P86', 'P676', 'P50']

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
    if (!response.ok) return null
    return (await response.json()) as T
  } catch {
    return null
  }
}

interface WikiSummary {
  extract?: string
  type?: string
  wikibase_item?: string
  content_urls?: { desktop?: { page?: string } }
  titles?: { normalized?: string }
}

interface WikidataClaims {
  entities?: Record<string, { claims?: Record<string, { mainsnak?: { datavalue?: { value?: { id?: string } } } }[]> }>
}

interface WikidataLabels {
  entities?: Record<string, { labels?: { en?: { value?: string } } }>
}

/** 요약문만으로 판정이 안 될 때 위키데이터로 작품 여부와 아티스트를 확인한다 */
async function verifyByWikidata(qid: string, wantArtist: string) {
  const claims = await fetchJson<WikidataClaims>(
    `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${qid}&props=claims&format=json`,
  )
  const entity = claims?.entities?.[qid]?.claims ?? {}
  const types = (entity.P31 ?? []).map((c) => c.mainsnak?.datavalue?.value?.id).filter(Boolean) as string[]
  const isWork = types.some((type) => WORK_TYPES.has(type))

  const creatorIds = CREATOR_PROPS.flatMap((prop) =>
    (entity[prop] ?? []).map((c) => c.mainsnak?.datavalue?.value?.id),
  ).filter(Boolean) as string[]

  let creatorMatches = false
  if (creatorIds.length) {
    const labels = await fetchJson<WikidataLabels>(
      `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${creatorIds.slice(0, 20).join('|')}&props=labels&languages=en&format=json`,
    )
    creatorMatches = Object.values(labels?.entities ?? {}).some((e) => {
      const name = normalize(e.labels?.en?.value ?? '')
      return !!name && !!wantArtist && (name.includes(wantArtist) || wantArtist.includes(name))
    })
  }
  return { isWork, creatorMatches }
}


/*
  한국 가요는 곡 낱장 문서가 드물고 수록 음반 문서에 정보가 실린다(조사 26.08.19 —
  마니아DB API는 소개문이 비어 있고, 멜론·나무위키는 약관·라이선스로 쓸 수 없다).
  곡 문서가 없으면 그 아티스트의 음반 문서를 찾되, 음반 원문에 곡 제목이 실려 있어야 채택한다.
*/
async function albumOfTrackFallback(
  keys: string[],
  trackTitle: string,
  wantArtist: string,
  language: 'en' | 'ko',
): Promise<WikipediaIntro | null> {
  if (trackTitle.trim().length < 2) return null
  const host = `https://${language}.wikipedia.org`

  for (const key of keys) {
    const summary = await fetchJson<WikiSummary>(
      `${host}/api/rest_v1/page/summary/${encodeURIComponent(key)}`,
    )
    const extract = summary?.extract?.trim()
    if (!extract || summary?.type !== 'standard') continue

    const saysAlbum =
      /(is|was)[^.]{0,80}?(album|ep|compilation)/i.test(extract) ||
      /(음반|앨범|EP)(이다|이며)/.test(extract)
    let isAlbum = saysAlbum
    let creatorMatches = !!wantArtist && normalize(extract).includes(wantArtist)
    if ((!isAlbum || !creatorMatches) && summary?.wikibase_item) {
      const verified = await verifyByWikidata(summary.wikibase_item, wantArtist)
      isAlbum = isAlbum || verified.isWork
      creatorMatches = creatorMatches || verified.creatorMatches
    }
    if (!isAlbum || !creatorMatches) continue

    // 음반 원문에 곡 제목이 있어야 수록곡으로 본다
    const page = await fetchJson<{ source?: string }>(
      `${host}/w/rest.php/v1/page/${encodeURIComponent(key)}`,
    )
    if (!page?.source?.includes(trackTitle.trim())) continue

    const albumTitle = (summary?.titles?.normalized ?? key.replace(/_/g, ' ')).replace(/\s*\([^)]*\)\s*$/, '')
    const prefix = language === 'ko'
      ? `수록 음반 《${albumTitle}》 — `
      : `From the album "${albumTitle}" — `
    return {
      text: prefix + extract,
      url: summary?.content_urls?.desktop?.page ?? `${host}/wiki/${key}`,
      title: summary?.titles?.normalized ?? key.replace(/_/g, ' '),
    }
  }
  return null
}

async function lookUp(
  unit: MusicUnit,
  title: string,
  artist: string,
  language: 'en' | 'ko',
): Promise<WikipediaIntro | null> {
  const host = `https://${language}.wikipedia.org`
  // 검색 보조어는 그 언어판의 낱말이어야 검색 순위에 먹힌다
  const hint = language === 'ko' ? (unit === 'album' ? '앨범' : '노래') : unit === 'album' ? 'album' : 'song'
  const query = `${title} ${artist} ${hint}`
  const search = await fetchJson<{ pages?: { key: string }[] }>(
    `${host}/w/rest.php/v1/search/page?q=${encodeURIComponent(query)}&limit=8`,
  )
  const keys = (search?.pages ?? []).map((page) => page.key)
  if (!keys.length) return null

  const wantTitle = normalize(title)
  const wantArtist = normalize(artist)
  const looser: WikipediaIntro[] = []

  for (const key of keys) {
    // 규칙 1 — 괄호 설명을 뗀 문서 제목이 요청 제목과 같아야 한다
    const documentTitle = normalize(key.replace(/_\(.*\)$/, '').replace(/_/g, ' '))
    if (!wantTitle || documentTitle !== wantTitle) continue

    const summary = await fetchJson<WikiSummary>(
      `${host}/api/rest_v1/page/summary/${encodeURIComponent(key)}`,
    )
    const extract = summary?.extract?.trim()
    if (!extract || summary?.type !== 'standard') continue

    /* summary API는 리다이렉트를 조용히 따라간다 — 곡 문서가 가수 문서로 넘어가는 한국 가요에서
       제목 검사가 무력화된다(「양화대교」→자이언티, 26.08.19 실측). 착지한 문서 제목을 다시 검사한다. */
    const landedTitle = normalize(
      (summary?.titles?.normalized ?? '').replace(/\s*\([^)]*\)\s*$/, ''),
    )
    if (landedTitle && landedTitle !== wantTitle) continue

    // 규칙 2·3 — 작품 문서인지, 그 아티스트의 것인지
    // 한국어 요약은 "…의 노래이다" 꼴이다 — 영어 규칙만 두면 ko 문서가 전부 판정 불능이 된다
    const saysAlbum =
      /\b(is|was)\b[^.]{0,80}?\b(album|box set|compilation|ep|record)\b/i.test(extract) ||
      /(음반|앨범|EP|컴필레이션)(이다|이며)/.test(extract)
    const saysSong =
      /\b(is|was)\b[^.]{0,80}?\b(song|single|ballad|composition|opera|aria)\b/i.test(extract) ||
      /(노래|싱글|곡)(이다|이며)/.test(extract)
    let isWork = saysAlbum || saysSong
    let creatorMatches = !!wantArtist && normalize(extract).includes(wantArtist)

    if ((!isWork || !creatorMatches) && summary?.wikibase_item) {
      const verified = await verifyByWikidata(summary.wikibase_item, wantArtist)
      isWork = isWork || verified.isWork
      creatorMatches = creatorMatches || verified.creatorMatches
    }
    if (!isWork || !creatorMatches) continue

    const intro: WikipediaIntro = {
      text: extract,
      url: summary?.content_urls?.desktop?.page ?? `${host}/wiki/${key}`,
      title: summary?.titles?.normalized ?? key.replace(/_/g, ' '),
    }

    // 규칙 4 — 물어본 종류와 문서 종류가 맞으면 바로 채택한다
    if (unit === 'album' ? saysAlbum : saysSong) return intro
    looser.push(intro)
  }

  // 같은 이름의 곡과 앨범이 함께 있는 경우 — 종류가 어긋나도 이름·아티스트가 맞으면 쓴다
  if (looser[0]) return looser[0]

  // 곡 문서가 없으면 수록 음반 문서라도 보여 준다 — 한국 가요는 이 경로가 본선이다
  if (unit === 'track') {
    return albumOfTrackFallback(keys, title, wantArtist, language)
  }
  return null
}

/**
 * 앨범·곡의 위키백과 소개를 찾는다. 확신이 서지 않으면 null을 준다.
 *
 * 실측(26.08.19, 무작위 표본 60) 채택률 65%. 못 찾는 쪽은 문서가 없는 마이너 곡과
 * 영문 문서가 없는 아시아권 가요다. 클래식은 작곡가 접두를 떼고 한 번 더 찾는다.
 */
export async function getMusicIntro(
  unit: MusicUnit,
  rawTitle: string,
  rawArtist: string,
  language: 'en' | 'ko' = 'en',
): Promise<WikipediaIntro | null> {
  const title = cleanTitle(rawTitle)
  const artist = cleanArtist(rawArtist)
  if (!title || !artist) return null

  const attempts = [title, withoutComposerPrefix(title, artist)].filter(
    (value): value is string => !!value,
  )
  for (const attempt of attempts) {
    const found = await lookUp(unit, attempt, artist, language)
    if (found) return found
  }
  return null
}
