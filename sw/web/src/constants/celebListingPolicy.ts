import type { CelebSortBy, GetCelebsParams } from '@/actions/home/getCelebs'
import { CELEB_SORT_OPTIONS } from './celebSort'

export const CELEB_LISTING_LIMITS = {
  pageSizes: [12, 24, 48] as readonly number[],
  defaultPageSize: 24,
  maxLimit: 200,
  maxOffset: 24_000,
  searchLength: 80,
  filterLength: 80,
  concurrentQueries: 8,
  timeoutMs: 12_000,
  professionBatchSize: 4,
  browserCache: { entries: 8, bytes: 1024 * 1024, ttlMs: 30_000 },
} as const

const SORTS: readonly CelebSortBy[] = [...CELEB_SORT_OPTIONS, 'trending']
const UUID = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i

export function listingPage(page: number, limit: number): number {
  return Math.min(Math.max(1, Number.isSafeInteger(page) ? page : 1), Math.floor(CELEB_LISTING_LIMITS.maxOffset / limit) + 1)
}

export function listingPageSize(value: number): number {
  return CELEB_LISTING_LIMITS.pageSizes.includes(value) ? value : CELEB_LISTING_LIMITS.defaultPageSize
}

// 좁힌 목록은 DB의 기본 일일 정렬만 쓴다. 기본 목록의 국가·트렌드 후보는 페이지마다 동일하게 유지한다.
export function canPromoteDailyListing(params: GetCelebsParams): boolean {
  return !params.ids && !params.search?.trim() && !params.factionId && params.contentPresence !== 'without' &&
    !params.profession && !params.nationality && !params.contentType && !params.gender &&
    params.birthYearMin === undefined && params.birthYearMax === undefined &&
    (!params.realities || (params.realities.length === 2 && params.realities.includes('REAL') && params.realities.includes('BOTH')))
}

// Server Action 인자는 타입 선언을 우회할 수 있으므로 캐시 키를 만들기 전에 검증한다.
export function normalizeListingParams(input: GetCelebsParams): GetCelebsParams {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Invalid listing request')
  const params = { ...input }
  const invalid = () => { throw new Error('Invalid listing filters') }
  for (const key of ['profession', 'nationality', 'contentType', 'gender', 'factionId', 'trendCountry'] as const) {
    const value = params[key]
    if (value !== undefined && (typeof value !== 'string' || value.length > CELEB_LISTING_LIMITS.filterLength)) invalid()
    if (value === 'all' || value === '') delete params[key]
  }
  if (params.sortBy !== undefined && !SORTS.includes(params.sortBy)) invalid()
  if (params.contentType !== undefined && !['BOOK', 'VIDEO', 'GAME', 'MUSIC'].includes(params.contentType)) invalid()
  if (params.gender !== undefined && !['male', 'female'].includes(params.gender)) invalid()
  if (params.contentPresence !== undefined && !['all', 'with', 'without'].includes(params.contentPresence)) invalid()
  if (params.factionId !== undefined && !UUID.test(params.factionId)) invalid()
  if (params.search !== undefined) {
    if (typeof params.search !== 'string' || params.search.length > CELEB_LISTING_LIMITS.searchLength) invalid()
    params.search = params.search.trim() || undefined
  }
  for (const key of ['includeInactive', 'includeTotal', 'includeViewerState'] as const) {
    if (params[key] !== undefined && typeof params[key] !== 'boolean') invalid()
  }
  for (const key of ['birthYearMin', 'birthYearMax'] as const) {
    const value = params[key]
    if (value !== undefined && (!Number.isSafeInteger(value) || value < -10_000 || value > 10_000)) invalid()
  }
  if (params.birthYearMin !== undefined && params.birthYearMax !== undefined && params.birthYearMin > params.birthYearMax) invalid()
  if (params.minContentCount !== undefined && (!Number.isSafeInteger(params.minContentCount) || params.minContentCount < 0)) invalid()
  for (const [key, allowed] of [['tiers', ['full', 'light']], ['realities', ['REAL', 'FICTION', 'BOTH']]] as const) {
    const values = params[key]
    if (values !== undefined && (!Array.isArray(values) || values.length > allowed.length || values.some(value => !(allowed as readonly string[]).includes(value)))) invalid()
  }
  if (params.ids !== undefined && (!Array.isArray(params.ids) || params.ids.length > CELEB_LISTING_LIMITS.maxLimit || params.ids.some(id => typeof id !== 'string' || !UUID.test(id)))) invalid()
  const limit = params.limit ?? 8
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > CELEB_LISTING_LIMITS.maxLimit) invalid()
  params.limit = limit
  params.page = listingPage(params.page ?? 1, limit)
  return params
}
