'use server'

import { unstable_cache } from 'next/cache'
import { readChart } from '@/lib/library/chartRead'
import { rawFetch } from '@/lib/rawFetch'
import { fetchStoreChart, selectStoreChart, STORE_CHART_CACHE_SECONDS } from '@/lib/library/storeChart'
import type { ChartLanguage } from '@/lib/library/chartSources'

// 국가별로 나누며, 조회 실패로 마지막 정상 캐시를 덮어쓰지 않는다.
const cachedStoreChart = unstable_cache(
  (language: ChartLanguage) => fetchStoreChart(rawFetch, language),
  ['library-apple-movie-chart-v2'],
  { revalidate: STORE_CHART_CACHE_SECONDS },
)

export async function getStoreChart(locale: string = 'ko') {
  const language = locale.startsWith('en') ? 'en' : 'ko'
  return selectStoreChart(await readChart(`storeChart:${language}`, () => cachedStoreChart(language)))
}
