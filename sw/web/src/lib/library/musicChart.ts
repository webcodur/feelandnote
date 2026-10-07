import { CHART_MAX_AGE_MS, fetchChartJson } from './bestsellerFeed'
import type { ChartLanguage } from './chartSources'
import { chartDetailLabels, chartReleaseDate } from './chartDetailText'

export const MUSIC_CHART_CACHE_SECONDS = 3600
export const MUSIC_CHART_LIMIT = 10
export interface MusicChartItem {
  id: string
  rank: number
  title: string
  artist: string
  artwork: string | null
  url: string
  releaseDate?: string | null
  genres?: string[]
  explicit?: boolean
}
export interface MusicChart {
  items: MusicChartItem[]
  updatedAt: string
  fetchedAt: string
  copyright: string
}
export interface MusicChartSelection extends MusicChart {
  status: 'ready' | 'unavailable'
  isStale: boolean
}
type JsonObject = { [key: string]: unknown }
const object = (value: unknown): JsonObject => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid music chart object')
  return value as JsonObject
}
const text = (value: unknown, max = 1000): string => {
  if (typeof value !== 'string' || !value.trim() || value.length > max) throw new Error('Invalid music chart text')
  return value.trim()
}
const url = (value: unknown): URL => {
  const parsed = new URL(text(value, 2048))
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.port) throw new Error('Invalid music chart URL')
  return parsed
}
export function musicChartFeedUrl(language: ChartLanguage): string {
  return `https://rss.marketingtools.apple.com/api/v2/${language === 'ko' ? 'kr' : 'us'}/music/most-played/${MUSIC_CHART_LIMIT}/songs.json`
}
export function parseMusicChart(value: unknown, language: ChartLanguage, now = Date.now()): MusicChart {
  const feed = object(object(value).feed)
  const country = language === 'ko' ? 'kr' : 'us'
  if (feed.id !== musicChartFeedUrl(language) || feed.country !== country) throw new Error('Music chart region mismatch')
  const updated = Date.parse(text(feed.updated))
  if (!Number.isFinite(updated) || updated > now + 300_000 || now - updated > CHART_MAX_AGE_MS) throw new Error('Invalid music chart date')
  if (!Array.isArray(feed.results) || !feed.results.length || feed.results.length > MUSIC_CHART_LIMIT) throw new Error('Invalid music chart items')
  const items = feed.results.map((value, index): MusicChartItem => {
    const row = object(value)
    const id = text(row.id)
    if (!/^\d+$/.test(id) || row.kind !== 'songs') throw new Error('Invalid music chart song')
    const destination = url(row.url)
    const matchesSong = destination.searchParams.get('i') === id || destination.pathname.endsWith(`/${id}`)
    if (destination.hostname !== 'music.apple.com' || !new RegExp(`^/${country}/(?:album|song)/`).test(destination.pathname) || !matchesSong) throw new Error('Invalid music chart destination')
    const cover = row.artworkUrl100 ? url(row.artworkUrl100) : null
    if (cover && !/^is\d+-ssl\.mzstatic\.com$/.test(cover.hostname)) throw new Error('Invalid music chart artwork')
    const genres = Array.isArray(row.genres) ? row.genres.flatMap(value => {
      if (!value || typeof value !== 'object') return []
      const genre = value as JsonObject
      return genre.genreId === '34' ? [] : [genre.name]
    }) : []
    return {
      id, rank: index + 1, title: text(row.name), artist: text(row.artistName), artwork: cover?.href ?? null, url: destination.href,
      releaseDate: chartReleaseDate(row.releaseDate), genres: chartDetailLabels(genres),
      explicit: row.contentAdvisoryRating === 'Explicit' || row.contentAdvisoryRating === 'Explict',
    }
  })
  if (new Set(items.map(item => item.id)).size !== items.length) throw new Error('Duplicate music chart song')
  return { items, updatedAt: new Date(updated).toISOString(), fetchedAt: new Date(now).toISOString(), copyright: text(feed.copyright) }
}
export async function fetchMusicChart(fetcher: typeof fetch, language: ChartLanguage): Promise<MusicChart> {
  return parseMusicChart(await fetchChartJson(fetcher, musicChartFeedUrl(language), { Accept: 'application/json' }), language)
}
export function selectMusicChart(chart: MusicChart | null, now = Date.now()): MusicChartSelection {
  const age = chart ? Math.max(now - Date.parse(chart.updatedAt), now - Date.parse(chart.fetchedAt)) : Infinity
  if (!chart || !Number.isFinite(age) || age < -300_000 || age > CHART_MAX_AGE_MS) {
    return { items: [], updatedAt: '', fetchedAt: '', copyright: '', status: 'unavailable', isStale: false }
  }
  return { ...chart, status: 'ready', isStale: age > MUSIC_CHART_CACHE_SECONDS * 1000 }
}
