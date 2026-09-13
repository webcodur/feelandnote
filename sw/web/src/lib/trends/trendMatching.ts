import { load } from 'cheerio'
import { parseTrendCountry, type TrendCountry } from '../../constants/trendCountries'

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

export function parseTrendRss(xml: string): string[] {
  if (xml.length > 1_000_000 || /<!DOCTYPE/i.test(xml)) throw new Error('Invalid Trends RSS')
  const $ = load(xml, { xml: true })
  if ($('rss > channel').length !== 1 || !/<\/rss\s*>\s*$/i.test(xml)) {
    throw new Error('Invalid Trends RSS')
  }
  return $('rss > channel > item').toArray().map((item) => {
    const title = $(item).children('title').text().trim()
    if (!title) throw new Error('Missing Trends title')
    return title
  })
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
