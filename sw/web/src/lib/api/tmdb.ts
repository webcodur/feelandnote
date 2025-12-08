// TMDB API 래퍼 (영화, 드라마)
// API 문서: https://developer.themoviedb.org/docs

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
