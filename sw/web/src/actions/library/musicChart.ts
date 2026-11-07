'use server'

import { unstable_cache } from 'next/cache'
import { readDisplayableChart } from '@/lib/library/chartRead'
import { rawFetch } from '@/lib/rawFetch'
import { fetchMusicChart, MUSIC_CHART_CACHE_SECONDS, selectMusicChart } from '@/lib/library/musicChart'
import type { ChartLanguage } from '@/lib/library/chartSources'

const readSource = (language: ChartLanguage) => fetchMusicChart(rawFetch, language)
// 실패는 던져 마지막 성공 캐시를 유지한다. 한국·미국 피드는 인자로 분리한다.
const cachedMusicChart = unstable_cache(
  readSource,
  ['library-apple-music-most-played-v2'],
  { revalidate: MUSIC_CHART_CACHE_SECONDS },
)

export async function getMusicChart(locale: string = 'ko') {
  const language = locale.startsWith('en') ? 'en' : 'ko'
  return readDisplayableChart(`musicChart:${language}`, () => cachedMusicChart(language), () => readSource(language), selectMusicChart)
}
