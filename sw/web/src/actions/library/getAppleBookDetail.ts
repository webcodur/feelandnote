'use server'

import { unstable_cache } from 'next/cache'
import { rawFetch } from '@/lib/rawFetch'
import { coalesceCacheQuery } from '@/lib/cacheQuery'
import { appleChartBookId, fetchAppleBookDetail } from '@/lib/library/appleBookDetail'
import { CHART_CACHE_SECONDS } from '@/lib/library/bestsellerFeed'

const readDetail = unstable_cache(
  (chartId: string) => fetchAppleBookDetail(rawFetch, chartId),
  ['apple-chart-book-detail-v1'],
  { revalidate: CHART_CACHE_SECONDS.en },
)

export async function getAppleBookDetail(chartId: string) {
  if (!appleChartBookId(chartId)) return null
  return coalesceCacheQuery(`apple-book-detail:${chartId}`, () => readDetail(chartId))
}
