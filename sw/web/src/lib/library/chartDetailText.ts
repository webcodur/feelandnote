import { load } from 'cheerio'

/** Optional chart metadata cannot make an otherwise valid ranking unavailable. */
export function chartDetailText(value: unknown, maxLength = 100_000): string | null {
  if (typeof value !== 'string' || value.length > maxLength) return null
  const $ = load(value, null, false)
  $('script, style, iframe, object, embed').remove()
  $('br').replaceWith('\n')
  $('p, div, li, h1, h2, h3, h4').append('\n\n')
  return $.root().text().replace(/\r/g, '').replace(/[\t ]+/g, ' ')
    .replace(/ *\n */g, '\n').replace(/\n{3,}/g, '\n\n').trim() || null
}

export function chartReleaseDate(value: unknown): string | null {
  const date = typeof value === 'string' ? value.slice(0, 10) : ''
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(Date.parse(date))
    && new Date(date).toISOString().startsWith(date) ? date : null
}

export function chartDetailLabels(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return [...new Set(value.slice(0, 10).map(label => chartDetailText(label, 200)).filter((label): label is string => !!label))]
}
