'use server'

import { unstable_cache } from 'next/cache'
import { readDisplayableChart } from '@/lib/library/chartRead'
import { rawFetch } from '@/lib/rawFetch'
import { fetchSteamChart, selectSteamChart, STEAM_CHART_CACHE_SECONDS } from '@/lib/library/steamChart'
import type { ChartLanguage } from '@/lib/library/chartSources'

const readSource = (language: ChartLanguage) => fetchSteamChart(rawFetch, language)
const cachedSteamChart = unstable_cache(
  readSource,
  ['library-steam-player-chart-v3'],
  { revalidate: STEAM_CHART_CACHE_SECONDS },
)

export async function getSteamChart(locale: string = 'ko') {
  const language = locale.startsWith('en') ? 'en' : 'ko'
  return readDisplayableChart(`steamChart:${language}`, () => cachedSteamChart(language), () => readSource(language), selectSteamChart)
}
