import { CELEB_CONTENT_COUNT } from '@feelandnote/shared/constants/celeb-content-research'

export type ImagePresenceFilter = 'all' | 'present' | 'missing'

export interface CelebColumnFilters {
  nationality?: string
  gender?: 'all' | 'male' | 'female' | 'unknown'
  avatar?: ImagePresenceFilter
  portrait?: ImagePresenceFilter
  awakened?: ImagePresenceFilter
  influenceMin?: number
  influenceMax?: number
  contentMin?: number
  contentMax?: number
  followerMin?: number
  followerMax?: number
  createdFrom?: string
  createdTo?: string
}

export type CelebColumnSearchParams = Partial<Record<keyof CelebColumnFilters, string>>

export const CELEB_COLUMN_FILTER_KEYS = [
  'nationality', 'gender', 'avatar', 'portrait', 'awakened',
  'influenceMin', 'influenceMax', 'contentMin', 'contentMax',
  'followerMin', 'followerMax', 'createdFrom', 'createdTo',
] as const satisfies readonly (keyof CelebColumnFilters)[]

const NUMERIC_FILTER_KEYS = [
  'influenceMin', 'influenceMax', 'contentMin', 'contentMax', 'followerMin', 'followerMax',
] as const

function parseCalendarDate(value: string | undefined): string | undefined {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith('0000')) return undefined
  const date = new Date(`${value}T00:00:00Z`)
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
    ? value
    : undefined
}

/** URL inputs are optional; blank fields must never become a numeric zero filter. */
export function parseCelebColumnFilters(params: CelebColumnSearchParams): CelebColumnFilters {
  const filters: CelebColumnFilters = {}
  const nationality = params.nationality?.trim()
  if (nationality && nationality !== 'all') filters.nationality = nationality
  if (params.gender === 'male' || params.gender === 'female' || params.gender === 'unknown') {
    filters.gender = params.gender
  }
  for (const key of ['avatar', 'portrait', 'awakened'] as const) {
    if (params[key] === 'present' || params[key] === 'missing') filters[key] = params[key]
  }
  for (const key of NUMERIC_FILTER_KEYS) {
    const raw = params[key]?.trim()
    if (!raw || !/^-?\d+$/.test(raw)) continue
    const value = Number(raw)
    const minimum = key === 'contentMin' || key === 'contentMax'
      ? CELEB_CONTENT_COUNT.RESEARCHED_EMPTY
      : 0
    if (Number.isSafeInteger(value) && value >= minimum) filters[key] = value
  }
  for (const key of ['createdFrom', 'createdTo'] as const) {
    const date = parseCalendarDate(params[key])
    if (date) filters[key] = date
  }
  return filters
}

export function hasCelebColumnFilters(filters: CelebColumnFilters): boolean {
  return CELEB_COLUMN_FILTER_KEYS.some((key) => {
    const value = filters[key]
    return value !== undefined && value !== '' && value !== 'all'
  })
}

export function hasCelebContentRange(filters: CelebColumnFilters): boolean {
  return filters.contentMin !== undefined || filters.contentMax !== undefined
}

export function hasCelebNumericRanges(filters: CelebColumnFilters): boolean {
  return NUMERIC_FILTER_KEYS.some((key) => filters[key] !== undefined)
}

export function matchesCelebNumericRanges(
  celeb: { influence_total: number; content_count: number; follower_count: number },
  filters: CelebColumnFilters,
): boolean {
  return (filters.influenceMin === undefined || celeb.influence_total >= filters.influenceMin)
    && (filters.influenceMax === undefined || celeb.influence_total <= filters.influenceMax)
    && (filters.contentMin === undefined || celeb.content_count >= filters.contentMin)
    && (filters.contentMax === undefined || celeb.content_count <= filters.contentMax)
    && (filters.followerMin === undefined || celeb.follower_count >= filters.followerMin)
    && (filters.followerMax === undefined || celeb.follower_count <= filters.followerMax)
}

/** The list displays Korean dates, so its date filters use Korean midnight boundaries. */
export function getCelebCreatedAtBounds(filters: Pick<CelebColumnFilters, 'createdFrom' | 'createdTo'>) {
  const from = parseCalendarDate(filters.createdFrom)
  const to = parseCalendarDate(filters.createdTo)
  return {
    fromInclusive: from ? `${from}T00:00:00+09:00` : undefined,
    toExclusive: to
      ? new Date(new Date(`${to}T00:00:00+09:00`).getTime() + 24 * 60 * 60 * 1000).toISOString()
      : undefined,
  }
}
