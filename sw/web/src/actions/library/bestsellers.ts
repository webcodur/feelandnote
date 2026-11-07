'use server'

import { unstable_cache } from 'next/cache'
import { rawFetch } from '@/lib/rawFetch'
import { CHART_CACHE_SECONDS, CHART_REQUEST_BUDGET_MS, fetchAppleBooksChart, fetchYes24Chart, recentKoreanChartDates, selectBookChart, yes24ChartEnabled, type BookChart } from '@/lib/library/bestsellerFeed'
import { readDisplayableChart } from '@/lib/library/chartRead'
import type { LibraryContent } from './types'

// A failed refresh throws so Next can retain its last successful cache entry.
const readAppleChart = () => fetchAppleBooksChart(rawFetch)
const getAppleChart = unstable_cache(readAppleChart, ['library-apple-paid-books-v2'], {
  revalidate: CHART_CACHE_SECONDS.en,
})
const readYes24Chart = async (latestDate: string) => {
  const signal = AbortSignal.timeout(CHART_REQUEST_BUDGET_MS)
  for (const basisDate of recentKoreanChartDates().filter(date => date <= latestDate)) {
    signal.throwIfAborted()
    try {
      return await fetchYes24Chart(rawFetch, process.env.YES24_API_KEY ?? '', basisDate, Date.now(), signal)
    } catch {
      signal.throwIfAborted()
    }
  }
  throw new Error('YES24 chart unavailable')
}
const getYes24Chart = unstable_cache(readYes24Chart, ['library-yes24-daily-books-v3-bounded'], {
  revalidate: CHART_CACHE_SECONDS.ko,
})

export async function getBestsellers(_categoryKey: string = 'ALL', locale: string = 'ko') {
  void _categoryKey // Legacy callers keep their signature; this feed contains books only.
  const language = locale.toLowerCase().startsWith('en') ? 'en' : 'ko'
  const select = (chart: BookChart | null) => selectBookChart(chart, language)
  // YES24의 전일 순위는 자정이 지나도 바로 나오지 않는다 — 최신 발행본이 잡힐 때까지 이전 날짜로 넘긴다
  const latestDate = recentKoreanChartDates()[0]
  const selection = language === 'en'
    ? await readDisplayableChart('apple-books', () => getAppleChart(), readAppleChart, select)
    : yes24ChartEnabled(process.env)
      ? await readDisplayableChart('yes24-books', () => getYes24Chart(latestDate), () => readYes24Chart(latestDate), select)
      : select(null)
  const asLibraryContents: LibraryContent[] = selection.items.map(item => ({
    id: item.id, title: item.title, creator: item.creator, thumbnail_url: item.thumbnail_url,
    type: 'BOOK', celeb_count: 0, user_count: 0, avg_rating: null, source_url: item.source_url,
    title_ko: item.title_ko || item.title, title_en: item.title_en || item.title,
    creator_en: item.creator_en || item.creator, thumbnail_en: item.thumbnail_en || item.thumbnail_url,
    has_en_edition: null,
  }))
  return { ...selection, asLibraryContents }
}
