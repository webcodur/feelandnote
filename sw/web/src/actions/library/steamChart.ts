'use server'

import { unstable_cache } from 'next/cache'
import { rawFetch } from '@/lib/rawFetch'
import { fetchSteamChart, selectSteamChart, STEAM_CHART_CACHE_SECONDS } from '@/lib/library/steamChart'
import type { ChartLanguage } from '@/lib/library/chartSources'

const cachedSteamChart = unstable_cache(
  (language: ChartLanguage) => fetchSteamChart(rawFetch, language),
  ['library-steam-player-chart-v2'],
  { revalidate: STEAM_CHART_CACHE_SECONDS },
)

export async function getSteamChart(locale: string = 'ko') {
  try {
    return selectSteamChart(await cachedSteamChart(locale.startsWith('en') ? 'en' : 'ko'))
  } catch {
    console.error('[library] Steam player chart unavailable')
    return selectSteamChart(null)
  }
}
