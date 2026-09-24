'use server'

import { unstable_cache } from 'next/cache'
import { rawFetch } from '@/lib/rawFetch'
import { CHART_CACHE_SECONDS, fetchAppleBooksChart, fetchYes24Chart, recentKoreanChartDates, selectBookChart, yes24ChartEnabled, type BookChart } from '@/lib/library/bestsellerFeed'
import type { LibraryContent } from './types'

// A failed refresh throws so Next can retain its last successful cache entry.
const getAppleChart = unstable_cache(() => fetchAppleBooksChart(rawFetch), ['library-apple-paid-books-v2'], {
  revalidate: CHART_CACHE_SECONDS.en,
})
const getYes24Chart = unstable_cache((basisDate: string) => fetchYes24Chart(rawFetch, process.env.YES24_API_KEY ?? '', basisDate), ['library-yes24-daily-books-v2-addon'], {
  revalidate: CHART_CACHE_SECONDS.ko,
})

/* 업스트림 실패는 캐시에 남지 않는다 — 다운된 피드가 요청마다 타임아웃(15초)을 먹지 않게
   마지막 실패 시각을 프로세스에 기억해 잠시 재시도를 쉰다 */
const CHART_RETRY_BACKOFF_MS = 10 * 60 * 1000
let appleDownUntil = 0

export async function getBestsellers(_categoryKey: string = 'ALL', locale: string = 'ko') {
  void _categoryKey // Legacy callers keep their signature; this feed contains books only.
  const language = locale.toLowerCase().startsWith('en') ? 'en' : 'ko'
  let chart: BookChart | null = null
  const enabled = language === 'en' || yes24ChartEnabled(process.env)
  if (enabled && language === 'en') {
    if (Date.now() >= appleDownUntil) {
      try {
        chart = await getAppleChart()
      } catch {
        appleDownUntil = Date.now() + CHART_RETRY_BACKOFF_MS
        // Never log upstream errors: they may contain request headers or credentials.
        console.error('[library] Apple Books chart unavailable')
      }
    }
  } else if (enabled) {
    // YES24의 전일 순위는 자정이 지나도 바로 나오지 않는다 — 최신 발행본이 잡힐 때까지 이전 날짜로 넘긴다
    for (const basisDate of recentKoreanChartDates()) {
      try {
        chart = await getYes24Chart(basisDate)
        break
      } catch {
        console.error(`[library] YES24 chart unavailable (${basisDate})`)
      }
    }
  }
  const selection = selectBookChart(chart, language)
  const asLibraryContents: LibraryContent[] = selection.items.map(item => ({
    id: item.id, title: item.title, creator: item.creator, thumbnail_url: item.thumbnail_url,
    type: 'BOOK', celeb_count: 0, user_count: 0, avg_rating: null, source_url: item.source_url,
    title_ko: item.title_ko || item.title, title_en: item.title_en || item.title,
    creator_en: item.creator_en || item.creator, thumbnail_en: item.thumbnail_en || item.thumbnail_url,
    has_en_edition: null,
  }))
  return { ...selection, asLibraryContents }
}
