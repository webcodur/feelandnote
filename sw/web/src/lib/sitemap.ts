import type { MetadataRoute } from 'next'
import { INDEXABLE_TIERS } from '@feelandnote/shared/constants/celeb-tiers'

export const SITEMAP_REVALIDATE_SECONDS = 86400
export const CONTENT_SITEMAP_BUCKETS = 8

export const SITEMAP_NAMES = [
  'core',
  'celebs',
  ...Array.from({ length: CONTENT_SITEMAP_BUCKETS }, (_, index) => `contents-${index}`),
] as const

const BASE_URL = 'https://feelandnote.com'

type SitemapEntry = MetadataRoute.Sitemap[number]

const INDEXABLE_TIER_FILTER =
  INDEXABLE_TIERS.length === 1
    ? `eq.${INDEXABLE_TIERS[0]}`
    : `in.(${INDEXABLE_TIERS.join(',')})`

async function fetchCelebs(): Promise<{
  slug: string
  created_at: string | null
  updated_at: string | null
}[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return []

  const allCelebs: {
    slug: string
    created_at: string | null
    updated_at: string | null
  }[] = []
  const pageSize = 1000
  let offset = 0

  while (true) {
    const params = new URLSearchParams({
      select: 'slug,created_at,updated_at',
      publication_status: 'eq.active',
      celeb_tier: INDEXABLE_TIER_FILTER,
      slug: 'not.is.null',
      order: 'created_at.asc',
      offset: String(offset),
      limit: String(pageSize),
    })

    const response = await fetch(`${url}/rest/v1/celebs?${params}`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      next: { revalidate: SITEMAP_REVALIDATE_SECONDS },
    })

    if (!response.ok) {
      console.error(`[sitemap] Supabase REST failed: ${response.status} ${response.statusText}`)
      break
    }

    const data = await response.json()
    allCelebs.push(...data)
    if (data.length < pageSize) break
    offset += pageSize
  }

  return allCelebs
}

async function fetchReviewedContents(): Promise<{
  id: string
  lastModified: Date | undefined
}[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return []

  const contentUpdatedAt = new Map<string, string>()
  const pageSize = 1000
  let offset = 0

  while (true) {
    const params = new URLSearchParams({
      select: 'content_id,updated_at',
      review: 'not.is.null',
      visibility: 'eq.public',
      order: 'id.asc',
      offset: String(offset),
      limit: String(pageSize),
    })

    const response = await fetch(`${url}/rest/v1/celeb_contents?${params}`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      next: { revalidate: SITEMAP_REVALIDATE_SECONDS },
    })

    if (!response.ok) {
      console.error(
        `[sitemap] celeb_contents REST failed: ${response.status} ${response.statusText}`,
      )
      break
    }

    const data: { content_id: string | null; updated_at: string | null }[] =
      await response.json()
    for (const row of data) {
      if (!row.content_id) continue
      const previous = contentUpdatedAt.get(row.content_id)
      if (row.updated_at && (!previous || row.updated_at > previous)) {
        contentUpdatedAt.set(row.content_id, row.updated_at)
      } else if (!previous) {
        contentUpdatedAt.set(row.content_id, '')
      }
    }

    if (data.length < pageSize) break
    offset += pageSize
  }

  return [...contentUpdatedAt].map(([id, updatedAt]) => ({
    id,
    lastModified: updatedAt ? new Date(updatedAt) : undefined,
  }))
}

async function fetchCuratedPaths(): Promise<string[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return []

  const response = await fetch(
    `${url}/rest/v1/curators?select=slug,curated_lists(slug)&is_featured=eq.true&limit=1000`,
    {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      next: { revalidate: SITEMAP_REVALIDATE_SECONDS },
    },
  )
  if (!response.ok) {
    console.error(`[sitemap] curators REST failed: ${response.status} ${response.statusText}`)
    return []
  }

  const data: { slug: string; curated_lists: { slug: string }[] | null }[] =
    await response.json()
  return data.flatMap((curator) => [
    `/library/curated/${curator.slug}`,
    ...(curator.curated_lists ?? []).map(
      (list) => `/library/curated/${curator.slug}/${list.slug}`,
    ),
  ])
}

function entry(
  path: string,
  changeFrequency: SitemapEntry['changeFrequency'],
  priority: number,
  lastModified?: Date,
): SitemapEntry[] {
  const normalizedPath = path === '/' ? '' : path
  const languages = {
    ko: `${BASE_URL}${normalizedPath}`,
    en: `${BASE_URL}/en${normalizedPath}`,
    'x-default': `${BASE_URL}${normalizedPath}`,
  }

  return [
    {
      url: languages.ko,
      ...(lastModified && { lastModified }),
      changeFrequency,
      priority,
      alternates: { languages },
    },
    {
      url: languages.en,
      ...(lastModified && { lastModified }),
      changeFrequency,
      priority,
      alternates: { languages },
    },
  ]
}

const staticPaths: [string, SitemapEntry['changeFrequency'], number][] = [
  ['/', 'daily', 1],
  ['/explore', 'daily', 0.8],
  ['/explore/figures', 'daily', 0.8],
  ['/explore/ranking', 'daily', 0.7],
  ['/explore/timeline', 'weekly', 0.7],
  ['/explore/faction', 'daily', 0.7],
  ['/explore/youtube', 'weekly', 0.7],
  ['/explore/persona', 'weekly', 0.6],
  ['/explore/today', 'daily', 0.7],
  ['/explore/directory', 'weekly', 0.8],
  ['/explore/feed', 'daily', 0.7],
  ['/library', 'daily', 0.8],
  ['/library/popular', 'weekly', 0.8],
  ['/library/museum', 'monthly', 0.7],
  ['/library/academy', 'monthly', 0.7],
  ['/library/curated', 'weekly', 0.8],
  ['/rest', 'monthly', 0.5],
  ['/about', 'monthly', 0.7],
  ['/terms', 'yearly', 0.3],
  ['/privacy', 'yearly', 0.3],
  ['/account-deletion', 'yearly', 0.3],
]

export async function getSitemapEntries(name: string): Promise<MetadataRoute.Sitemap | null> {
  if (name === 'core') {
    const curatedPaths = await fetchCuratedPaths()
    return [
      ...staticPaths.flatMap(([path, frequency, priority]) =>
        entry(path, frequency, priority),
      ),
      ...curatedPaths.flatMap((path) => entry(path, 'monthly', 0.7)),
    ]
  }

  if (name === 'celebs') {
    const celebs = await fetchCelebs()
    return celebs.flatMap((celeb) =>
      entry(
        `/celeb/${celeb.slug}`,
        'weekly',
        0.7,
        celeb.updated_at
          ? new Date(celeb.updated_at)
          : celeb.created_at
            ? new Date(celeb.created_at)
            : undefined,
      ),
    )
  }

  const contentMatch = /^contents-(\d+)$/.exec(name)
  if (!contentMatch) return null

  const bucket = Number(contentMatch[1])
  if (!Number.isInteger(bucket) || bucket < 0 || bucket >= CONTENT_SITEMAP_BUCKETS) return null

  const reviewedContents = await fetchReviewedContents()
  return reviewedContents
    .filter(({ id }) => contentBucket(id) === bucket)
    .flatMap(({ id, lastModified }) =>
      entry(`/content/${id}`, 'monthly', 0.6, lastModified),
    )
}

function contentBucket(id: string): number {
  const firstHex = Number.parseInt(id.replaceAll('-', '').charAt(0), 16)
  return Number.isNaN(firstHex) ? 0 : firstHex % CONTENT_SITEMAP_BUCKETS
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export function serializeSitemap(entries: MetadataRoute.Sitemap): string {
  const urls = entries.map((item) => {
    const alternateLinks = Object.entries(item.alternates?.languages ?? {})
      .map(
        ([language, url]) =>
          `    <xhtml:link rel="alternate" hreflang="${escapeXml(language)}" href="${escapeXml(String(url))}" />`,
      )
      .join('\n')
    const lastModified = item.lastModified
      ? `    <lastmod>${escapeXml(
          item.lastModified instanceof Date
            ? item.lastModified.toISOString()
            : String(item.lastModified),
        )}</lastmod>`
      : ''
    const changeFrequency = item.changeFrequency
      ? `    <changefreq>${item.changeFrequency}</changefreq>`
      : ''
    const priority = item.priority === undefined ? '' : `    <priority>${item.priority}</priority>`

    return [
      '  <url>',
      `    <loc>${escapeXml(item.url)}</loc>`,
      alternateLinks,
      lastModified,
      changeFrequency,
      priority,
      '  </url>',
    ]
      .filter(Boolean)
      .join('\n')
  })

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.join('\n')}
</urlset>`
}

export function serializeSitemapIndex(): string {
  const sitemaps = SITEMAP_NAMES.map(
    (name) => `  <sitemap><loc>${BASE_URL}/sitemaps/${name}.xml</loc></sitemap>`,
  )

  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemaps.join('\n')}
</sitemapindex>`
}
