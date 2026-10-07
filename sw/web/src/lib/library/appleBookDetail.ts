import { fetchChartJson } from './bestsellerFeed'
import { chartDetailText, chartReleaseDate } from './chartDetailText'

export interface AppleBookDetail {
  description: string | null
  releaseDate: string | null
  genres: string[]
  sourceUrl: string
}

export function appleChartBookId(value: unknown): string | null {
  return typeof value === 'string' ? /^apple-books-([1-9]\d{0,15})$/.exec(value)?.[1] ?? null : null
}

// 차트의 미국 도서 ID를 그대로 조회한다. 소개용 정보만 반환하고 타 판매처 가격은 가져오지 않는다.
export function parseAppleBookDetail(value: unknown, chartId: string): AppleBookDetail | null {
  const id = appleChartBookId(chartId)
  if (!id) throw new Error('Invalid Apple chart book ID')
  const root = value as { resultCount?: unknown; results?: unknown[] } | null
  if (!root || !Array.isArray(root.results) || root.resultCount !== root.results.length || root.results.length > 1) {
    throw new Error('Invalid Apple book detail response')
  }
  if (!root.results.length) return null
  const row = root.results[0] as Record<string, unknown> | null
  if (!row || row.kind !== 'ebook' || !Number.isSafeInteger(row.trackId) || String(row.trackId) !== id) {
    throw new Error('Apple book identity mismatch')
  }
  if (typeof row.trackViewUrl !== 'string') throw new Error('Missing Apple book source')
  const source = new URL(row.trackViewUrl)
  if (source.protocol !== 'https:' || source.hostname !== 'books.apple.com' || source.username || source.password || source.port
    || !source.pathname.startsWith('/us/book/') || !source.pathname.endsWith(`/id${id}`)) {
    throw new Error('Apple book source mismatch')
  }
  source.search = ''
  source.hash = ''
  const releaseDate = chartReleaseDate(row.releaseDate)
  const genres = Array.isArray(row.genres) ? row.genres.filter((genre): genre is string =>
    typeof genre === 'string' && genre.trim().length > 0 && genre.length <= 100 && genre !== 'Books').slice(0, 10) : []
  return { description: chartDetailText(row.description), releaseDate, genres: [...new Set(genres)], sourceUrl: source.href }
}

export async function fetchAppleBookDetail(fetcher: typeof fetch, chartId: string): Promise<AppleBookDetail | null> {
  const id = appleChartBookId(chartId)
  if (!id) throw new Error('Invalid Apple chart book ID')
  const url = new URL('https://itunes.apple.com/lookup')
  url.search = new URLSearchParams({ id, country: 'us', entity: 'ebook' }).toString()
  return parseAppleBookDetail(await fetchChartJson(fetcher, url.href, { Accept: 'application/json' }, ['application/json', 'text/javascript']), chartId)
}
