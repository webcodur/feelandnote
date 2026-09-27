import { CHART_MAX_AGE_MS, fetchChartJson } from './bestsellerFeed'
import type { ChartLanguage } from './chartSources'

export const STORE_CHART_LIMIT = 10
export const STORE_CHART_CACHE_SECONDS = 3600
export interface StoreChartItem {
  id: string
  rank: number
  title: string
  creator: string
  artwork: string | null
  url: string
}
export interface StoreChart {
  items: StoreChartItem[]
  updatedAt: string
  fetchedAt: string
  copyright: string
}
export interface StoreChartSelection extends StoreChart {
  status: 'ready' | 'unavailable'
  isStale: boolean
}

type JsonObject = { [key: string]: unknown }
const object = (value: unknown): JsonObject => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid store chart object')
  return value as JsonObject
}
const text = (value: unknown): string => {
  if (typeof value !== 'string' || !value.trim() || value.length > 2048) throw new Error('Invalid store chart text')
  return value.trim()
}
const label = (value: unknown) => text(object(value).label)
const url = (value: unknown): URL => {
  const parsed = new URL(text(value))
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.port) throw new Error('Invalid store chart URL')
  return parsed
}

export function storeChartFeedUrl(language: ChartLanguage): string {
  const country = language === 'ko' ? 'kr' : 'us'
  return `https://itunes.apple.com/${country}/rss/topmovies/limit=${STORE_CHART_LIMIT}/json`
}

export function parseStoreChart(value: unknown, language: ChartLanguage, now = Date.now()): StoreChart {
  const feed = object(object(value).feed)
  if (label(feed.id) !== storeChartFeedUrl(language)) throw new Error('Store chart source mismatch')
  const updated = Date.parse(label(feed.updated))
  if (!Number.isFinite(updated) || updated > now + 300_000 || now - updated > CHART_MAX_AGE_MS) throw new Error('Invalid store chart date')
  if (!Array.isArray(feed.entry) || !feed.entry.length || feed.entry.length > STORE_CHART_LIMIT) throw new Error('Invalid store chart items')
  const country = language === 'ko' ? 'kr' : 'us'
  const items = feed.entry.map((value, index): StoreChartItem => {
    const row = object(value)
    const id = text(object(object(row.id).attributes)['im:id'])
    if (!/^\d+$/.test(id)) throw new Error('Invalid store chart id')
    if (object(object(row['im:contentType']).attributes).term !== 'Movie') throw new Error('Invalid store chart media')
    const links = (Array.isArray(row.link) ? row.link : [row.link]).map(value => object(object(value).attributes))
    const destination = url(links.find(link => link.rel === 'alternate' && link.type === 'text/html')?.href)
    if (destination.hostname !== 'itunes.apple.com' || !destination.pathname.startsWith(`/${country}/movie/`) || !destination.pathname.endsWith(`/id${id}`)) throw new Error('Invalid store chart destination')
    const images = Array.isArray(row['im:image']) ? row['im:image'] : []
    const artwork = images.length ? url(label(images[images.length - 1])) : null
    if (artwork && !/^is\d+-ssl\.mzstatic\.com$/.test(artwork.hostname)) throw new Error('Invalid store chart artwork')
    return { id, rank: index + 1, title: label(row['im:name']), creator: label(row['im:artist']), artwork: artwork?.href ?? null, url: destination.href }
  })
  if (new Set(items.map(item => item.id)).size !== items.length) throw new Error('Duplicate store chart item')
  return { items, updatedAt: new Date(updated).toISOString(), fetchedAt: new Date(now).toISOString(), copyright: label(feed.rights) }
}

export async function fetchStoreChart(fetcher: typeof fetch, language: ChartLanguage): Promise<StoreChart> {
  // Apple 구형 RSS는 JSON 본문을 text/javascript로 보낸다. 실행하지 않고 JSON.parse로만 읽는다.
  return parseStoreChart(await fetchChartJson(fetcher, storeChartFeedUrl(language), { Accept: 'application/json' }, ['application/json', 'text/javascript']), language)
}

export function selectStoreChart(chart: StoreChart | null, now = Date.now()): StoreChartSelection {
  const age = chart ? Math.max(now - Date.parse(chart.updatedAt), now - Date.parse(chart.fetchedAt)) : Infinity
  if (!chart || !Number.isFinite(age) || age < -300_000 || age > CHART_MAX_AGE_MS) {
    return { items: [], updatedAt: '', fetchedAt: '', copyright: '', status: 'unavailable', isStale: false }
  }
  return { ...chart, status: 'ready', isStale: age > STORE_CHART_CACHE_SECONDS * 1000 }
}
