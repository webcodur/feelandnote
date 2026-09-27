import { fetchChartJson } from './bestsellerFeed'
import type { ChartLanguage } from './chartSources'

export const STEAM_CHART_URL = 'https://api.steampowered.com/ISteamChartsService/GetGamesByConcurrentPlayers/v1/'
export const STEAM_CHART_CACHE_SECONDS = 600
export const STEAM_CHART_MAX_AGE_MS = 2 * 3600_000
export const STEAM_CHART_LIMIT = 10
const CANDIDATE_LIMIT = 30

export interface SteamChartItem {
  id: number
  rank: number
  title: string
  artwork: string | null
  url: string
  players: number
  peakPlayers: number
}
export interface SteamChart {
  items: SteamChartItem[]
  updatedAt: string
  fetchedAt: string
}
export interface SteamChartSelection extends SteamChart {
  status: 'ready' | 'unavailable'
  isStale: boolean
}
interface SteamRank { id: number; rank: number; players: number; peakPlayers: number }
type JsonObject = { [key: string]: unknown }
const object = (value: unknown): JsonObject => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid Steam object')
  return value as JsonObject
}
const integer = (value: unknown, min = 0): number => {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < min) throw new Error('Invalid Steam number')
  return value
}

export function parseSteamRanks(value: unknown, now = Date.now()) {
  const response = object(object(value).response)
  const updated = integer(response.last_update, 1) * 1000
  if (updated > now + 300_000 || now - updated > STEAM_CHART_MAX_AGE_MS) throw new Error('Invalid Steam chart date')
  if (!Array.isArray(response.ranks) || !response.ranks.length || response.ranks.length > 1000) throw new Error('Invalid Steam ranks')
  const ids = new Set<number>()
  let previousRank = 0
  const ranks: SteamRank[] = response.ranks.map(value => {
    const row = object(value)
    const id = integer(row.appid, 1)
    const rank = integer(row.rank, 1)
    const players = integer(row.concurrent_in_game)
    const peakPlayers = integer(row.peak_in_game)
    if (ids.has(id) || rank <= previousRank || peakPlayers < players) throw new Error('Invalid Steam rank order or count')
    ids.add(id)
    previousRank = rank
    return { id, rank, players, peakPlayers }
  })
  return { updatedAt: new Date(updated).toISOString(), ranks: ranks.slice(0, CANDIDATE_LIMIT) }
}

function artwork(value: unknown, id: number): string | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const assets = object(value)
  const template = assets.asset_url_format
  const filename = assets.library_capsule
  if (typeof template !== 'string' || typeof filename !== 'string') return null
  if (!template.startsWith(`steam/apps/${id}/`) || !/^steam\/apps\/\d+\/\$\{FILENAME\}(?:\?t=\d+)?$/.test(template)) return null
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_/-]*\.(jpg|png|webp)$/.test(filename)) return null
  return `https://shared.fastly.steamstatic.com/store_item_assets/${template.replace('${FILENAME}', filename)}`
}

export function steamItemsUrl(ids: readonly number[], language: ChartLanguage): string {
  const input = { ids: ids.map(appid => ({ appid })), context: {
    language: language === 'ko' ? 'koreana' : 'english', country_code: language === 'ko' ? 'KR' : 'US',
  }, data_request: { include_assets: true } }
  return `https://api.steampowered.com/IStoreBrowseService/GetItems/v1/?input_json=${encodeURIComponent(JSON.stringify(input))}`
}

export function assembleSteamChart(chart: ReturnType<typeof parseSteamRanks>, value: unknown, now = Date.now()): SteamChart {
  const entries = object(object(value).response).store_items
  if (!Array.isArray(entries) || entries.length > CANDIDATE_LIMIT) throw new Error('Invalid Steam metadata')
  const requested = new Set(chart.ranks.map(row => row.id))
  const metadata = new Map<number, JsonObject>()
  for (const value of entries) {
    const row = object(value)
    const id = integer(row.id, 1)
    if (!requested.has(id) || metadata.has(id)) throw new Error('Steam metadata identity mismatch')
    metadata.set(id, row)
  }
  const items = chart.ranks.flatMap((row): SteamChartItem[] => {
    const meta = metadata.get(row.id)
    // 게임이 아니거나 조회할 수 없는 상품은 제외하고 공식 순위 번호는 유지한다.
    if (!meta || meta.success !== 1 || meta.item_type !== 0 || meta.type !== 0) return []
    if (meta.appid !== row.id) throw new Error('Steam app identity mismatch')
    if (typeof meta.name !== 'string' || !meta.name.trim() || meta.name.length > 500) throw new Error('Invalid Steam title')
    return [{ ...row, title: meta.name.trim(), artwork: artwork(meta.assets, row.id), url: `https://store.steampowered.com/app/${row.id}/` }]
  }).slice(0, STEAM_CHART_LIMIT)
  if (!items.length) throw new Error('Empty Steam game chart')
  return { items, updatedAt: chart.updatedAt, fetchedAt: new Date(now).toISOString() }
}

export async function fetchSteamChart(fetcher: typeof fetch, language: ChartLanguage): Promise<SteamChart> {
  const ranks = parseSteamRanks(await fetchChartJson(fetcher, STEAM_CHART_URL, { Accept: 'application/json' }))
  const metadata = await fetchChartJson(fetcher, steamItemsUrl(ranks.ranks.map(row => row.id), language), { Accept: 'application/json' })
  return assembleSteamChart(ranks, metadata)
}

export function selectSteamChart(chart: SteamChart | null, now = Date.now()): SteamChartSelection {
  const age = chart ? Math.max(now - Date.parse(chart.updatedAt), now - Date.parse(chart.fetchedAt)) : Infinity
  if (!chart || !chart.items.length || !Number.isFinite(age) || age < -300_000 || age > STEAM_CHART_MAX_AGE_MS) {
    return { items: [], updatedAt: '', fetchedAt: '', status: 'unavailable', isStale: false }
  }
  return { ...chart, status: 'ready', isStale: age > STEAM_CHART_CACHE_SECONDS * 1000 }
}
