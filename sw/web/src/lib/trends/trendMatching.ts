import { load } from 'cheerio'
import { parseTrendCountry, TREND_PERIOD_HOURS, type TrendCountry } from '../../constants/trendCountries'

export interface RegisteredTrendPerson {
  id: string
  nickname: string | null
  nickname_en: string | null
}

export interface CountryTrendingPeople {
  ids: string[]
  available: boolean
}

/** Keep punctuation and accents: broad token matching can mistake companies or namesakes for people. */
export function normalizeTrendName(value: string): string {
  return value.normalize('NFKC').trim().replace(/\s+/gu, ' ').toLowerCase()
}

/**
 * The public Trending now page embeds every row in ds:0; its visible table only has 25.
 * RSS contains just ten recently started searches and misses still-relevant people.
 * This is Google's page data, not a stable API: changed/missing structure must fail closed.
 */
export function parseTrendPage(html: string, country: TrendCountry, now = Date.now()): string[] {
  if (html.length > 8_000_000 || !Number.isFinite(now)) throw new Error('Invalid Trends page')
  const $ = load(html)
  const datasets = $('script').toArray().map((script) => $(script).text()).filter((text) =>
    /^\s*AF_initDataCallback\s*\(/.test(text) && /\bkey\s*:\s*(['"])ds:0\1/.test(text))
  if (datasets.length !== 1) throw new Error('Missing Trends dataset')
  const payload = datasets[0].match(/\bdata\s*:\s*(\[[\s\S]*\])\s*,\s*sideChannel\s*:/)?.[1]
  if (!payload) throw new Error('Invalid Trends dataset')
  // Never evaluate a downloaded script: only its JSON data array is accepted.
  const data: unknown = JSON.parse(payload)
  if (!Array.isArray(data) || !Array.isArray(data[1])) throw new Error('Invalid Trends rows')
  const rows = data[1].map((row: unknown) => {
    if (!Array.isArray(row) || typeof row[0] !== 'string' || !row[0].trim() || row[2] !== country ||
      !Array.isArray(row[3]) || !Number.isSafeInteger(row[3][0]) || row[3][0] <= 0 ||
      !Number.isSafeInteger(row[6]) || row[6] < 0) throw new Error('Invalid Trends row')
    const started = row[3][0] * 1000
    if (started > now + 5 * 60_000) throw new Error('Future Trends timestamp')
    if (row[4] !== null && (!Array.isArray(row[4]) || !Number.isSafeInteger(row[4][0]) || row[4][0] < row[3][0])) {
      throw new Error('Invalid Trends end timestamp')
    }
    return { title: row[0].trim(), volume: row[6] as number, started }
  })
  return rows
    .filter((row) => row.started >= now - TREND_PERIOD_HOURS * 3_600_000)
    .sort((a, b) => b.volume - a.volume || b.started - a.started || (a.title < b.title ? -1 : a.title > b.title ? 1 : 0))
    .map((row) => row.title)
}

/** The directory must include every accessible registered person, before any UI filters. */
export function matchTrendingPeople(titles: string[], directory: RegisteredTrendPerson[]): string[] {
  const peopleByName = new Map<string, Set<string>>()
  for (const person of directory) {
    for (const name of [person.nickname, person.nickname_en]) {
      if (!name) continue
      const key = normalizeTrendName(name)
      if (!key) continue
      const ids = peopleByName.get(key) ?? new Set<string>()
      ids.add(person.id)
      peopleByName.set(key, ids)
    }
  }
  const result = new Set<string>()
  for (const title of titles) {
    const ids = peopleByName.get(normalizeTrendName(title))
    if (ids?.size === 1) result.add(ids.values().next().value!)
  }
  return [...result]
}

export async function resolveCountryTrendingPeople(
  country: unknown,
  loader: (country: TrendCountry) => Promise<string[]>,
): Promise<CountryTrendingPeople> {
  const parsed = parseTrendCountry(country)
  if (!parsed) return { ids: [], available: false }
  try {
    return { ids: await loader(parsed), available: true }
  } catch {
    return { ids: [], available: false }
  }
}
