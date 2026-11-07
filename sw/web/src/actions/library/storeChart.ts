'use server'

import { unstable_cache } from 'next/cache'
import { readDisplayableChart } from '@/lib/library/chartRead'
import { rawFetch } from '@/lib/rawFetch'
import { fetchStoreChart, selectStoreChart, STORE_CHART_CACHE_SECONDS } from '@/lib/library/storeChart'
import type { ChartLanguage } from '@/lib/library/chartSources'

const readSource = (language: ChartLanguage) => fetchStoreChart(rawFetch, language)
// 국가별로 나누며, 조회 실패로 마지막 정상 캐시를 덮어쓰지 않는다.
const cachedStoreChart = unstable_cache(
  readSource,
  ['library-apple-movie-chart-v2'],
  { revalidate: STORE_CHART_CACHE_SECONDS },
)

export async function getStoreChart(locale: string = 'ko') {
  const language = locale.startsWith('en') ? 'en' : 'ko'
  return readDisplayableChart(`storeChart:${language}`, () => cachedStoreChart(language), () => readSource(language), selectStoreChart)
}
