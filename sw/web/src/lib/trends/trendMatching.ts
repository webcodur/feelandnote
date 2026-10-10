import { load } from 'cheerio'
import { parseTrendCountry, TREND_PERIOD_HOURS, type TrendCountry } from '../../constants/trendCountries'
import { getCelebYear } from '../celeb/lifespan'

/** Historic namesakes steal modern news searches (연암 박지원, 삼국지 법정); on 2026-09-16 every match born earlier was one. */
export const TREND_MIN_BIRTH_YEAR = 1900

export interface RegisteredTrendPerson {
  id: string
  nickname: string | null
  nickname_en: string | null
  birth_date?: string | null
}

/** A registered person matched to one trending row. (type, not interface — coalescePublicRead needs an index signature) */
export type TrendMatch = {
  id: string
  /** Title of the trend row that matched — the person's own trending query. */
  trendTitle: string
  /** 1-based position of the matched trend row in the volume-sorted window — the number chips show. */
  rank: number
  /** Search volume Google's row reports — the scale behind the rank. */
  volume: number
  /** When the surge started (epoch ms). */
  started: number
}

export interface CountryTrendingPeople {
  matches: TrendMatch[]
  available: boolean
}

/** One trending search. */
export interface TrendSearch {
  title: string
  /** Search volume Google's row reports. */
  volume: number
  /** When the surge started (epoch ms). */
  started: number
}

/** Searches drop or add spaces ("런정 페이"), so spaces are ignored. Keep punctuation and accents: broad token matching can mistake companies or namesakes for people. */
export function normalizeTrendName(value: string): string {
  return value.normalize('NFKC').replace(/\s+/gu, '').toLowerCase()
}

/**
 * The public Trending now page embeds every row in ds:0; its visible table only has 25.
 * RSS contains just ten recently started searches and misses still-relevant people.
 * This is Google's page data, not a stable API: changed/missing structure must fail closed.
 */
export function parseTrendPage(html: string, country: TrendCountry, now = Date.now()): TrendSearch[] {
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
    const related: unknown = row[9] ?? []
    if (!Array.isArray(related) || related.some((query) => typeof query !== 'string')) throw new Error('Invalid Trends related queries')
    return {
      title: row[0].trim(),
      related: (related as string[]).map((query) => query.trim()).filter(Boolean),
      volume: row[6] as number,
      started,
    }
  })
  return rows
    .filter((row) => row.started >= now - TREND_PERIOD_HOURS * 3_600_000)
    .sort((a, b) => b.volume - a.volume || b.started - a.started || (a.title < b.title ? -1 : a.title > b.title ? 1 : 0))
    .map(({ title, volume, started }) => ({ title, volume, started }))
}

/**
 * The directory must include every accessible registered person, before any UI filters.
 * Only the trend row's primary title matches a person. Related queries also name people
 * around a story (a co-star, a founder's company), but those riders kept reading as noise
 * next to people whose own name is trending, so they are not surfaced.
 * Matches form a single list ordered by trend-row rank: the chip shows that rank.
 */
export function matchTrendingPeople(trends: TrendSearch[], directory: RegisteredTrendPerson[]): TrendMatch[] {
  const peopleByName = new Map<string, Set<string>>()
  for (const person of directory) {
    // Excluded before indexing, so a modern namesake stops counting as ambiguous.
    const born = getCelebYear(person.birth_date)
    if (born !== null && born < TREND_MIN_BIRTH_YEAR) continue
    for (const name of [person.nickname, person.nickname_en]) {
      if (!name) continue
      const key = normalizeTrendName(name)
      if (!key) continue
      const ids = peopleByName.get(key) ?? new Set<string>()
      ids.add(person.id)
      peopleByName.set(key, ids)
    }
  }
  // Maps preserve insertion order, which is first-match (trend row rank) order.
  const matched = new Map<string, { title: string; rank: number; volume: number; started: number }>()
  trends.forEach((trend, index) => {
    const ids = peopleByName.get(normalizeTrendName(trend.title))
    if (ids?.size !== 1) return
    const id = ids.values().next().value!
    if (!matched.has(id)) matched.set(id, { title: trend.title, rank: index + 1, volume: trend.volume, started: trend.started })
  })
  return [...matched].map(([id, hit]) => ({ id, trendTitle: hit.title, rank: hit.rank, volume: hit.volume, started: hit.started }))
}

export async function resolveCountryTrendingPeople(
  country: unknown,
  loader: (country: TrendCountry) => Promise<TrendMatch[]>,
): Promise<CountryTrendingPeople> {
  const parsed = parseTrendCountry(country)
  if (!parsed) return { matches: [], available: false }
  try {
    return { matches: await loader(parsed), available: true }
  } catch {
    return { matches: [], available: false }
  }
}
