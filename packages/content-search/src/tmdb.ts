// TMDB API 래퍼 (영상: 영화, 드라마, 애니메이션)
// API 문서: https://developer.themoviedb.org/docs

export type VideoSubtype = 'movie' | 'tv'

const TMDB_API_KEY = process.env.TMDB_API_KEY
const TMDB_BASE_URL = 'https://api.themoviedb.org/3'
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500'

interface TMDBMovie {
  id: number
  title: string
  original_title: string
  overview: string
  poster_path: string | null
  backdrop_path: string | null
  release_date: string
  vote_average: number
  genre_ids: number[]
}

interface TMDBTVShow {
  id: number
  name: string
  original_name: string
  overview: string
  poster_path: string | null
  backdrop_path: string | null
  first_air_date: string
  vote_average: number
  genre_ids: number[]
}

// Multi 검색용 통합 타입
interface TMDBMultiResult {
  id: number
  media_type: 'movie' | 'tv' | 'person'
  // movie fields
  title?: string
  original_title?: string
  release_date?: string
  // tv fields
  name?: string
  original_name?: string
  first_air_date?: string
  // common fields
  overview?: string
  poster_path: string | null
  backdrop_path: string | null
  vote_average: number
  genre_ids?: number[]
}

interface TMDBSearchResponse<T> {
  page: number
  results: T[]
  total_pages: number
  total_results: number
}

interface TMDBCredits {
  cast: { name: string; character: string }[]
  crew: { name: string; job: string }[]
}

// 통합 영상 검색 결과 타입
export interface VideoSearchResult {
  externalId: string
  externalSource: 'tmdb'
  category: 'video'
  subtype: VideoSubtype
  title: string
  creator: string
  coverImageUrl: string | null
  metadata: {
    originalTitle: string
    releaseDate: string
    overview: string
    voteAverage: number
    genres: string[]
    // 추가 상세 정보 (getVideoById에서만 제공)
    tagline?: string
    runtime?: number // 분 단위
    budget?: number
    revenue?: number
    cast?: { name: string; character: string }[]
    director?: string
    backdropUrl?: string
  }
}

// Legacy 타입 (하위 호환용)
export interface MovieSearchResult {
  externalId: string
  externalSource: 'tmdb'
  category: 'movie'
  title: string
  creator: string
  coverImageUrl: string | null
  metadata: {
    originalTitle: string
    releaseDate: string
    overview: string
    voteAverage: number
    genres: string[]
  }
}

export interface DramaSearchResult {
  externalId: string
  externalSource: 'tmdb'
  category: 'drama'
  title: string
  creator: string
  coverImageUrl: string | null
  metadata: {
    originalTitle: string
    firstAirDate: string
    overview: string
    voteAverage: number
    genres: string[]
  }
}

// 장르 ID -> 이름 매핑
const MOVIE_GENRES: Record<number, string> = {
  28: '액션', 12: '모험', 16: '애니메이션', 35: '코미디', 80: '범죄',
  99: '다큐멘터리', 18: '드라마', 10751: '가족', 14: '판타지', 36: '역사',
  27: '공포', 10402: '음악', 9648: '미스터리', 10749: '로맨스', 878: 'SF',
  10770: 'TV 영화', 53: '스릴러', 10752: '전쟁', 37: '서부'
}

const TV_GENRES: Record<number, string> = {
  10759: '액션 & 어드벤처', 16: '애니메이션', 35: '코미디', 80: '범죄',
  99: '다큐멘터리', 18: '드라마', 10751: '가족', 10762: '키즈', 9648: '미스터리',
  10763: '뉴스', 10764: '리얼리티', 10765: 'SF & 판타지', 10766: '연속극',
  10767: '토크', 10768: '전쟁 & 정치', 37: '서부'
}

export async function searchMovies(
  query: string,
  page: number = 1
): Promise<{
  items: MovieSearchResult[]
  total: number
  hasMore: boolean
}> {
  if (!TMDB_API_KEY) {
    throw new Error('TMDB API 키가 설정되지 않았습니다. .env 파일에 TMDB_API_KEY를 설정해주세요.')
  }

  const params = new URLSearchParams({
    api_key: TMDB_API_KEY,
    query,
    page: String(page),
    language: 'ko-KR',
    include_adult: 'false'
  })

  const response = await fetch(`${TMDB_BASE_URL}/search/movie?${params}`)

  if (!response.ok) {
    throw new Error(`TMDB API 오류: ${response.status}`)
  }

  const data: TMDBSearchResponse<TMDBMovie> = await response.json()

  const items: MovieSearchResult[] = data.results.map((movie) => ({
    externalId: `tmdb-movie-${movie.id}`,
    externalSource: 'tmdb' as const,
    category: 'movie' as const,
    title: movie.title,
    creator: '',
    coverImageUrl: movie.poster_path ? `${TMDB_IMAGE_BASE}${movie.poster_path}` : null,
    metadata: {
      originalTitle: movie.original_title,
      releaseDate: movie.release_date,
      overview: movie.overview,
      voteAverage: movie.vote_average,
      genres: movie.genre_ids.map(id => MOVIE_GENRES[id] || '기타').filter(Boolean)
    }
  }))

  return {
    items,
    total: data.total_results,
    hasMore: data.page < data.total_pages
  }
}

export async function searchTVShows(
  query: string,
  page: number = 1
): Promise<{
  items: DramaSearchResult[]
  total: number
  hasMore: boolean
}> {
  if (!TMDB_API_KEY) {
    throw new Error('TMDB API 키가 설정되지 않았습니다. .env 파일에 TMDB_API_KEY를 설정해주세요.')
  }

  const params = new URLSearchParams({
    api_key: TMDB_API_KEY,
    query,
    page: String(page),
    language: 'ko-KR',
    include_adult: 'false'
  })

  const response = await fetch(`${TMDB_BASE_URL}/search/tv?${params}`)

  if (!response.ok) {
    throw new Error(`TMDB API 오류: ${response.status}`)
  }

  const data: TMDBSearchResponse<TMDBTVShow> = await response.json()

  const items: DramaSearchResult[] = data.results.map((show) => ({
    externalId: `tmdb-tv-${show.id}`,
    externalSource: 'tmdb' as const,
    category: 'drama' as const,
    title: show.name,
    creator: '',
    coverImageUrl: show.poster_path ? `${TMDB_IMAGE_BASE}${show.poster_path}` : null,
    metadata: {
      originalTitle: show.original_name,
      firstAirDate: show.first_air_date,
      overview: show.overview,
      voteAverage: show.vote_average,
      genres: show.genre_ids.map(id => TV_GENRES[id] || '기타').filter(Boolean)
    }
  }))

  return {
    items,
    total: data.total_results,
    hasMore: data.page < data.total_pages
  }
}

// 통합 영상 검색 (영화 + TV)
export async function searchVideo(
  query: string,
  page: number = 1
): Promise<{
  items: VideoSearchResult[]
  total: number
  hasMore: boolean
}> {
  if (!TMDB_API_KEY) {
    throw new Error('TMDB API 키가 설정되지 않았습니다. .env 파일에 TMDB_API_KEY를 설정해주세요.')
  }

  const params = new URLSearchParams({
    api_key: TMDB_API_KEY,
    query,
    page: String(page),
    language: 'ko-KR',
    include_adult: 'false'
  })

  const response = await fetch(`${TMDB_BASE_URL}/search/multi?${params}`)

  if (!response.ok) {
    throw new Error(`TMDB API 오류: ${response.status}`)
  }

  const data: TMDBSearchResponse<TMDBMultiResult> = await response.json()

  // person 제외, movie/tv만 필터링
  const items: VideoSearchResult[] = data.results
    .filter((item) => item.media_type === 'movie' || item.media_type === 'tv')
    .map((item) => {
      const isMovie = item.media_type === 'movie'
      const genres = isMovie ? MOVIE_GENRES : TV_GENRES

      return {
        externalId: `tmdb-${item.media_type}-${item.id}`,
        externalSource: 'tmdb' as const,
        category: 'video' as const,
        subtype: item.media_type as 'movie' | 'tv',
        title: isMovie ? item.title! : item.name!,
        creator: '',
        coverImageUrl: item.poster_path ? `${TMDB_IMAGE_BASE}${item.poster_path}` : null,
        metadata: {
          originalTitle: isMovie ? item.original_title! : item.original_name!,
          releaseDate: isMovie ? item.release_date || '' : item.first_air_date || '',
          overview: item.overview || '',
          voteAverage: item.vote_average,
          genres: (item.genre_ids || []).map(id => genres[id] || '기타').filter(Boolean)
        }
      }
    })

  return {
    items,
    total: data.total_results,
    hasMore: data.page < data.total_pages
  }
}

// 영화 상세 정보 (감독 포함)
export async function getMovieDetails(movieId: number): Promise<{
  director: string
  cast: string[]
} | null> {
  if (!TMDB_API_KEY) return null

  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/movie/${movieId}/credits?api_key=${TMDB_API_KEY}&language=ko-KR`
    )

    if (!response.ok) return null

    const data: TMDBCredits = await response.json()
    const director = data.crew.find(c => c.job === 'Director')?.name || ''
    const cast = data.cast.slice(0, 5).map(c => c.name)

    return { director, cast }
  } catch {
    return null
  }
}

// YouTube 트레일러 키 조회
interface TMDBVideoResult {
  key: string
  site: string
  type: string
  official: boolean
}

export async function getVideoTrailer(externalId: string): Promise<string | null> {
  if (!TMDB_API_KEY) return null

  // tmdb-movie-123, tmdb-tv-123, tmdb_123 모두 지원
  const fullMatch = externalId.match(/^tmdb-(movie|tv)-(\d+)$/)
  const shortMatch = externalId.match(/^tmdb[_-](\d+)$/)

  // mediaType이 명시된 경우 해당 타입만, 아닌 경우 movie → tv 순서로 시도
  const candidates: [string, string][] = fullMatch
    ? [[fullMatch[1], fullMatch[2]]]
    : shortMatch
      ? [['movie', shortMatch[1]], ['tv', shortMatch[1]]]
      : []

  if (candidates.length === 0) return null

  try {
    for (const [mediaType, id] of candidates) {
      // 양 언어의 트레일러를 모두 수집한 뒤 공식 영상 우선 선택
      const allTrailers: TMDBVideoResult[] = []

      for (const lang of ['ko-KR', 'en-US']) {
        const res = await fetch(
          `${TMDB_BASE_URL}/${mediaType}/${id}/videos?api_key=${TMDB_API_KEY}&language=${lang}`
        )
        if (!res.ok) continue

        const data: { results: TMDBVideoResult[] } = await res.json()
        const trailers = data.results.filter(v => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser'))
        allTrailers.push(...trailers)
      }

      // 공식 Trailer > 공식 Teaser > 비공식 Trailer > 비공식 Teaser
      allTrailers.sort((a, b) => {
        if (a.official !== b.official) return a.official ? -1 : 1
        if (a.type !== b.type) return a.type === 'Trailer' ? -1 : 1
        return 0
      })

      if (allTrailers.length > 0) return allTrailers[0].key
    }

    return null
  } catch {
    return null
  }
}

// ID로 영상 정보 조회 (metadata 포함 - 상세 정보 강화)
export async function getVideoById(externalId: string): Promise<VideoSearchResult | null> {
  if (!TMDB_API_KEY) return null

  // externalId 형식: tmdb-movie-123 또는 tmdb-tv-456
  const match = externalId.match(/^tmdb-(movie|tv)-(\d+)$/)
  if (!match) return null

  const [, mediaType, id] = match
  const isMovie = mediaType === 'movie'

  try {
    // 상세 정보 + Credits 병렬 요청
    const [detailRes, creditsRes] = await Promise.all([
      fetch(`${TMDB_BASE_URL}/${mediaType}/${id}?api_key=${TMDB_API_KEY}&language=ko-KR`),
      fetch(`${TMDB_BASE_URL}/${mediaType}/${id}/credits?api_key=${TMDB_API_KEY}&language=ko-KR`)
    ])

    if (!detailRes.ok) return null

    const data = await detailRes.json()
    
    // Credits 파싱 (실패해도 계속 진행)
    let cast: { name: string; character: string }[] = []
    let director = ''
    
    if (creditsRes.ok) {
      const credits: TMDBCredits = await creditsRes.json()
      // 상위 5명의 출연진
      cast = credits.cast.slice(0, 5).map(c => ({ name: c.name, character: c.character }))
      // 감독 찾기 (영화만 해당, TV는 created_by 필드 사용)
      if (isMovie) {
        director = credits.crew.find(c => c.job === 'Director')?.name || ''
      }
    }
    
    // TV 시리즈의 경우 created_by 필드 사용
    if (!isMovie && data.created_by?.length > 0) {
      director = data.created_by.map((c: { name: string }) => c.name).join(', ')
    }

    return {
      externalId,
      externalSource: 'tmdb',
      category: 'video',
      subtype: mediaType as 'movie' | 'tv',
      title: isMovie ? data.title : data.name,
      creator: director,
      coverImageUrl: data.poster_path ? `${TMDB_IMAGE_BASE}${data.poster_path}` : null,
      metadata: {
        originalTitle: isMovie ? data.original_title : data.original_name,
        releaseDate: isMovie ? data.release_date || '' : data.first_air_date || '',
        overview: data.overview || '',
        voteAverage: data.vote_average,
        genres: (data.genres || []).map((g: { id: number; name: string }) => g.name),
        // 추가 상세 정보
        tagline: data.tagline || undefined,
        runtime: isMovie ? data.runtime : (data.episode_run_time?.[0] || undefined),
        budget: isMovie ? data.budget : undefined,
        revenue: isMovie ? data.revenue : undefined,
        cast: cast.length > 0 ? cast : undefined,
        director: director || undefined,
        backdropUrl: data.backdrop_path ? `${TMDB_IMAGE_BASE}${data.backdrop_path}` : undefined
      }
    }
  } catch {
    return null
  }
}
