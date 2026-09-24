import { unstable_cache } from 'next/cache'
import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { selectAllPages } from '@feelandnote/shared/lib/paginate'
import { TREND_PERIOD_HOURS, type TrendCountry } from '@/constants/trendCountries'
import { createStaticClient } from '@/lib/db/static'
import { rawFetch } from '@/lib/rawFetch'
import {
  matchTrendingPeople,
  parseTrendPage,
  resolveCountryTrendingPeople,
  type CountryTrendingPeople,
  type RegisteredTrendPerson,
  type TrendMatch,
} from './trendMatching'

const TREND_REVALIDATE_SECONDS = 3600
const TREND_REQUEST_TIMEOUT_MS = 8000

// Names only, globally shared across countries. Never filter by nationality, tier, or current UI filters.
const getRegisteredPeople = unstable_cache(async (): Promise<RegisteredTrendPerson[]> => {
  const db = createStaticClient()
  const signal = AbortSignal.timeout(TREND_REQUEST_TIMEOUT_MS)
  return selectAllPages<RegisteredTrendPerson>((from, to) => db
    .from('celebs')
    .select('id,nickname,nickname_en,birth_date')
    .order('id')
    .range(from, to)
    .abortSignal(signal))
}, ['country-trend-registered-names-v2'], {
  revalidate: TREND_REVALIDATE_SECONDS,
  tags: [CACHE_TAGS.CELEBS],
})

async function fetchCountryMatches(country: TrendCountry): Promise<TrendMatch[]> {
  const response = await rawFetch(`https://trends.google.com/trending?geo=${country}&hl=en&hours=${TREND_PERIOD_HOURS}`, {
    signal: AbortSignal.timeout(TREND_REQUEST_TIMEOUT_MS),
    headers: { Accept: 'text/html' },
  })
  if (!response.ok) throw new Error(`Trends page HTTP ${response.status}`)
  const trends = parseTrendPage(await response.text(), country)
  if (trends.length === 0) return []
  return matchTrendingPeople(trends, await getRegisteredPeople())
}

// unstable_cache includes the country argument in its key; failed reads throw and aren't stored as an empty feed.
const getCountryMatches = unstable_cache(fetchCountryMatches, ['country-trending-people-page-v8'], {
  revalidate: TREND_REVALIDATE_SECONDS,
  tags: [CACHE_TAGS.CELEBS],
})

export async function getCountryTrendingPeople(country: string): Promise<CountryTrendingPeople> {
  return resolveCountryTrendingPeople(country, getCountryMatches)
}
