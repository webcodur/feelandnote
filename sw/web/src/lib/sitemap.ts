import type { MetadataRoute } from 'next'
import { INDEXABLE_TIERS } from '@feelandnote/shared/constants/celeb-tiers'
import { CELEB_PROFESSIONS } from '@feelandnote/shared/constants/celeb-professions'

export const SITEMAP_REVALIDATE_SECONDS = 86400

/**
 * 작품 상세(`/content/{uuid}`)는 사이트맵에서 제외한다 (2026-08-14).
 *
 * 본문이 출판사 소개문이라 서점·출판사·나무위키에 같은 글이 이미 있고, 주소도 UUID라
 * 검색어와 이어질 단서가 없다. 순위가 나올 수 없는 14,386개가 전체 제출량의 79%를 차지해
 * 크롤 예산을 소진시켰고, 직접 작성한 인물 글은 「발견됨 - 색인 생성 안 됨」에 머물렀다.
 * 색인 대상은 인물과 주요 목록으로 좁힌다. 작품 페이지 자체는 그대로 두며, 내부 링크로만 닿는다.
 */
export const SITEMAP_NAMES = ['core', 'celebs'] as const

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
      order: 'created_at.asc,id.asc',
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
  ['/explore/spectrum', 'weekly', 0.6],
  ['/explore/today', 'daily', 0.7],
  ['/explore/directory', 'weekly', 0.8],
  // 직군별 명부 — 인물 상세로 가는 중간 허브. 직군 목록은 CELEB_PROFESSIONS 상수가 쥔다
  ...CELEB_PROFESSIONS.map(
    (prof): [string, SitemapEntry['changeFrequency'], number] => [
      `/explore/directory/${prof.value}`,
      'weekly',
      0.7,
    ],
  ),
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

  return null
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
