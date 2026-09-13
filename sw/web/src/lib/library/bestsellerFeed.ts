import type { BestsellerItem } from '@/actions/library/types'
import { BESTSELLER_CATEGORY_KEYS as CATEGORY_KEYS, BOOK_CHARTS, validBestsellerItems } from './bestsellerPolicy.mjs'

export const BESTSELLER_FEED_URL = 'https://raw.githubusercontent.com/webcodur/feelandnote/main/sw/web/src/constants/library/bestsellers.json'
export const BESTSELLER_REVALIDATE_SECONDS = 3600
const STALE_AFTER_MS = 8 * 24 * 60 * 60 * 1000

interface LocaleDataset {
  categories: Record<string, BestsellerItem[]>
  category_updated_at?: Record<string, string>
}
export interface BestsellerFeed {
  updated_at: string
  ko: LocaleDataset
  en: LocaleDataset
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)
const validDate = (value: unknown): value is string => typeof value === 'string' && Number.isFinite(Date.parse(value)) && Date.parse(value) <= Date.now() + 60_000

// 공개 파일도 잘못된 수집 결과일 수 있다. 검증 실패는 캐시에 저장하지 않는다.
export function parseBestsellerFeed(value: unknown): BestsellerFeed {
  if (!isRecord(value) || !validDate(value.updated_at)) throw new Error('Invalid bestseller publication date')
  for (const locale of ['ko', 'en']) {
    const dataset = value[locale]
    if (!isRecord(dataset) || !isRecord(dataset.categories)) throw new Error(`Missing bestseller locale: ${locale}`)
    const dates = dataset.category_updated_at
    if (dates !== undefined && !isRecord(dates)) throw new Error('Invalid bestseller category dates')
    for (const key of CATEGORY_KEYS) {
      const items = dataset.categories[key]
      if (!validBestsellerItems(items)) throw new Error(`Invalid bestseller category: ${locale}/${key}`)
      if (dates && !validDate(dates[key])) throw new Error(`Invalid bestseller date: ${locale}/${key}`)
    }
  }
  return value as unknown as BestsellerFeed
}

export async function fetchBestsellerFeed(fetcher: typeof fetch): Promise<BestsellerFeed> {
  const response = await fetcher(BESTSELLER_FEED_URL, {
    signal: AbortSignal.timeout(8000), headers: { Accept: 'application/json' },
  })
  if (!response.ok) throw new Error(`Bestseller feed HTTP ${response.status}`)
  const text = await response.text()
  if (text.length > 2_000_000) throw new Error('Bestseller feed exceeds size limit')
  return parseBestsellerFeed(JSON.parse(text))
}

function sourceFor(locale: 'ko' | 'en', key: string) {
  if (key === 'VIDEO') return { name: 'TMDB', url: 'https://www.themoviedb.org/trending/all/week' }
  if (key === 'GAME') return { name: 'Steam', url: 'https://store.steampowered.com/charts/topselling/global' }
  if (key === 'MUSIC') return { name: 'Apple Music', url: `https://music.apple.com/${locale === 'ko' ? 'kr' : 'us'}/browse/top-charts` }
  if (locale === 'ko') {
    const cid = (BOOK_CHARTS as Record<string, { cid: string }>)[key]?.cid ?? '0'
    return { name: '알라딘', url: `https://www.aladin.co.kr/shop/common/wbest.aspx?BestType=${key === 'STEADY' ? 'SteadySeller' : 'Bestseller'}&BranchType=1&CID=${cid}` }
  }
  const subject = (BOOK_CHARTS as Record<string, { subject?: string }>)[key]?.subject
  return { name: 'Open Library', url: subject ? `https://openlibrary.org/subjects/${subject}` : 'https://openlibrary.org/trending/weekly' }
}

// CDN 전파 지연이나 오래된 공개본 때문에 번들에 든 최신 목록으로부터 되돌아가지 않는다.
export function mergeBestsellerFeeds(published: BestsellerFeed, bundled: BestsellerFeed): BestsellerFeed {
  const merged = structuredClone(published)
  for (const locale of ['ko', 'en'] as const) {
    merged[locale].category_updated_at ??= {}
    for (const key of CATEGORY_KEYS) {
      const publishedDate = published[locale].category_updated_at?.[key] ?? published.updated_at
      const bundledDate = bundled[locale].category_updated_at?.[key] ?? bundled.updated_at
      if (Date.parse(bundledDate) > Date.parse(publishedDate)) {
        merged[locale].categories[key] = bundled[locale].categories[key]
        merged[locale].category_updated_at[key] = bundledDate
      }
    }
  }
  return merged
}

export function selectBestsellers(data: BestsellerFeed, category: string, locale: string, now = Date.now()) {
  const lang = locale.toLowerCase().startsWith('en') ? 'en' : 'ko'
  const dataset = data[lang]
  const key = CATEGORY_KEYS.includes(category as typeof CATEGORY_KEYS[number]) ? category : 'ALL'
  const keys = category === 'MEDIA_ALL' ? ['ALL', 'VIDEO', 'GAME', 'MUSIC'] : [key]
  const items = keys.flatMap(k => category === 'MEDIA_ALL' ? dataset.categories[k].slice(0, 6) : dataset.categories[k])
  const dates = keys.map(k => dataset.category_updated_at?.[k] ?? data.updated_at)
  const updatedAt = dates.reduce((oldest, date) => Date.parse(date) < Date.parse(oldest) ? date : oldest)
  return {
    items, updatedAt, sources: keys.map(k => sourceFor(lang, k)),
    isStale: now - Date.parse(updatedAt) > STALE_AFTER_MS,
  }
}
