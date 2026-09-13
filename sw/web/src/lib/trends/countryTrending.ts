import { unstable_cache } from 'next/cache'
import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { selectAllPages } from '@feelandnote/shared/lib/paginate'
import type { TrendCountry } from '@/constants/trendCountries'
import { createStaticClient } from '@/lib/db/static'
import { rawFetch } from '@/lib/rawFetch'
import {
  matchTrendingPeople,
  parseTrendRss,
  resolveCountryTrendingPeople,
  type CountryTrendingPeople,
  type RegisteredTrendPerson,
} from './trendMatching'

const TREND_REVALIDATE_SECONDS = 3600
const TREND_REQUEST_TIMEOUT_MS = 8000

// Names only, globally shared across countries. Never filter by nationality, tier, or current UI filters.
const getRegisteredPeople = unstable_cache(async (): Promise<RegisteredTrendPerson[]> => {
  const db = createStaticClient()
  const signal = AbortSignal.timeout(TREND_REQUEST_TIMEOUT_MS)
  return selectAllPages<RegisteredTrendPerson>((from, to) => db
    .from('celebs')
    .select('id,nickname,nickname_en')
    .order('id')
    .range(from, to)
    .abortSignal(signal))
}, ['country-trend-registered-names-v1'], {
  revalidate: TREND_REVALIDATE_SECONDS,
  tags: [CACHE_TAGS.CELEBS],
})

async function fetchCountryIds(country: TrendCountry): Promise<string[]> {
  const response = await rawFetch(`https://trends.google.com/trending/rss?geo=${country}`, {
    signal: AbortSignal.timeout(TREND_REQUEST_TIMEOUT_MS),
    headers: { Accept: 'application/rss+xml, application/xml;q=0.9' },
  })
  if (!response.ok) throw new Error(`Trends RSS HTTP ${response.status}`)
  const titles = parseTrendRss(await response.text())
  if (titles.length === 0) return []
  return matchTrendingPeople(titles, await getRegisteredPeople())
}

// unstable_cache includes the country argument in its key; failed reads throw and aren't stored as an empty feed.
const getCountryIds = unstable_cache(fetchCountryIds, ['country-trending-people-v1'], {
  revalidate: TREND_REVALIDATE_SECONDS,
  tags: [CACHE_TAGS.CELEBS],
})

export async function getCountryTrendingPeople(country: string): Promise<CountryTrendingPeople> {
  return resolveCountryTrendingPeople(country, getCountryIds)
}
