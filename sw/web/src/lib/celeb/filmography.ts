/** TMDB 크레딧을 작품 ID별로 합친다. 화면·조회·검증이 같은 역할과 표시 기준을 쓴다. */
export const FILMOGRAPHY_PAGE_SIZE = {
  mobile: { initial: 4, more: 2 },
  desktop: { initial: 8, more: 4 },
} as const

export function getFilmographyVisibleCounts(total: number, expandedBatches: number) {
  return {
    mobile: Math.min(total, FILMOGRAPHY_PAGE_SIZE.mobile.initial + expandedBatches * FILMOGRAPHY_PAGE_SIZE.mobile.more),
    desktop: Math.min(total, FILMOGRAPHY_PAGE_SIZE.desktop.initial + expandedBatches * FILMOGRAPHY_PAGE_SIZE.desktop.more),
  }
}
export const FILMOGRAPHY_CACHE_TTL_MS = 24 * 60 * 60 * 1000
const LEADING_CAST_ORDER = 5
const NON_FICTION_TV_GENRES = new Set([10763, 10764, 10767])
export const FILMOGRAPHY_ROLES = ['acting', 'directing', 'writing', 'production', 'music', 'crew'] as const
export type FilmographyRole = (typeof FILMOGRAPHY_ROLES)[number]

export interface FilmographyWork {
  id: string
  mediaType: 'movie' | 'tv'
  title: string
  year: string | null
  poster: string | null
  roles: FilmographyRole[]
  characters: string[]
  jobs: string[]
}

export interface Filmography {
  personId: number | null
  imdbId: string | null
  works: FilmographyWork[]
}

export type FilmographyMedia = 'all' | FilmographyWork['mediaType']
export type FilmographySort = 'popular' | 'latest'
export interface FilmographyFilters {
  search: string
  media: FilmographyMedia
  role: 'all' | FilmographyRole
  sort: FilmographySort
}

/** 원본은 주요 역할·투표수에 따른 주요작순이다. 검색·정렬은 원본 배열을 바꾸지 않는다. */
export function filterFilmography(works: readonly FilmographyWork[], filters: FilmographyFilters) {
  const normalize = (value: string) => value.normalize('NFKC').toLowerCase().replace(/\s+/g, '')
  const query = normalize(filters.search)
  const filtered = works.filter(work =>
    (filters.media === 'all' || work.mediaType === filters.media)
    && (filters.role === 'all' || work.roles.includes(filters.role))
    && (!query || normalize(work.title).includes(query)))
  if (filters.sort === 'latest') filtered.sort((a, b) => Number(b.year ?? -1) - Number(a.year ?? -1))
  return filtered
}

export interface TmdbPersonCredits {
  id: number
  known_for_department?: string
  external_ids?: { wikidata_id?: string | null; imdb_id?: string | null }
  combined_credits?: { cast?: TmdbCredit[]; crew?: TmdbCredit[] }
}

export interface TmdbCredit {
  id: number
  media_type: string
  title?: string
  name?: string
  original_title?: string
  original_name?: string
  release_date?: string
  first_air_date?: string
  poster_path?: string | null
  adult?: boolean
  character?: string
  department?: string
  job?: string
  vote_count?: number
  popularity?: number
  order?: number
  genre_ids?: number[]
}

const DEPARTMENT_ROLE: Record<string, FilmographyRole> = {
  Acting: 'acting', Directing: 'directing', Writing: 'writing', Production: 'production', Sound: 'music',
}

// 본인 등장·자료화면과 감사 표기는 창작 참여작에 섞지 않는다. 성우 출연은 보존한다.
const NON_ACTING = /\b(self|himself|herself|themselves|interviewee|archive\s+(footage|sound))\b|^(본인|本人)(?:\s|$)|아카이브/i

export function normalizeFilmography(person: TmdbPersonCredits): Filmography {
  type RankedWork = FilmographyWork & { votes: number; popularity: number; billing: number }
  const works = new Map<string, RankedWork>()
  const add = (credit: TmdbCredit, cast: boolean) => {
    if (!Number.isSafeInteger(credit.id) || credit.id <= 0 || credit.adult) return
    if (credit.media_type !== 'movie' && credit.media_type !== 'tv') return
    if (cast && NON_ACTING.test(credit.character ?? '')) return
    if (cast && credit.media_type === 'tv' && credit.genre_ids?.some(id => NON_FICTION_TV_GENRES.has(id))) return
    if (!cast && (!credit.job || credit.department === 'Thanks')) return
    const title = (credit.title || credit.name || credit.original_title || credit.original_name)?.trim()
    if (!title) return
    const id = `tmdb-${credit.media_type}-${credit.id}`
    const role = cast ? 'acting' : DEPARTMENT_ROLE[credit.department ?? ''] ?? 'crew'
    let work = works.get(id)
    if (!work) {
      const date = credit.release_date || credit.first_air_date || ''
      work = { id, mediaType: credit.media_type, title,
        year: /^\d{4}-/.test(date) ? date.slice(0, 4) : null,
        poster: credit.poster_path && /^\/[\w.-]+$/.test(credit.poster_path)
          ? `https://image.tmdb.org/t/p/w342${credit.poster_path}` : null,
        roles: [], characters: [], jobs: [],
        votes: Number.isFinite(credit.vote_count) ? credit.vote_count! : 0,
        popularity: Number.isFinite(credit.popularity) ? credit.popularity! : 0,
        billing: Infinity }
      works.set(id, work)
    }
    if (!work.roles.includes(role)) work.roles.push(role)
    if (cast && Number.isInteger(credit.order) && credit.order! >= 0) work.billing = Math.min(work.billing, credit.order!)
    const character = credit.character?.trim()
    if (cast && character && !work.characters.includes(character)) work.characters.push(character)
    if (!cast && credit.job && !work.jobs.includes(credit.job)) work.jobs.push(credit.job)
  }
  for (const credit of person.combined_credits?.cast ?? []) add(credit, true)
  for (const credit of person.combined_credits?.crew ?? []) add(credit, false)
  const mainRole = DEPARTMENT_ROLE[person.known_for_department ?? '']
  const ranked = [...works.values()].sort((a, b) =>
    Number(Boolean(mainRole && b.roles.includes(mainRole))) - Number(Boolean(mainRole && a.roles.includes(mainRole)))
    || (mainRole === 'acting' ? Number(b.billing <= LEADING_CAST_ORDER) - Number(a.billing <= LEADING_CAST_ORDER) : 0)
    || b.votes - a.votes || b.popularity - a.popularity || a.id.localeCompare(b.id))
  return {
    personId: person.id,
    imdbId: /^nm\d+$/.test(person.external_ids?.imdb_id ?? '') ? person.external_ids!.imdb_id! : null,
    works: ranked.map(work => ({ id: work.id, mediaType: work.mediaType, title: work.title, year: work.year,
      poster: work.poster, characters: work.characters, jobs: work.jobs,
      roles: FILMOGRAPHY_ROLES.filter(role => work.roles.includes(role)) })),
  }
}
