import type { MetadataRoute } from 'next'
import { INDEXABLE_TIERS } from '@feelandnote/shared/constants/celeb-tiers'
import { CACHE_TAGS, type CacheTag } from '@feelandnote/shared/constants/cache-tags'
import { getCelebProfessions } from '@/lib/celeb-professions'
import { getAlternates, SITE_URL } from './seo'
import { getCelebProfileUrl } from './url'
import { INFLUENCE_RANKING_FIELDS, getInfluenceRankingHref } from '@/constants/influenceRanking'
import { CURATOR_PAGE_SIZE } from '@/components/features/library/hub/curatorExplore'
import { CURATED_HUB_PATH, resolveCuratedHubMeta } from './library/curatedMeta'

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

const BASE_URL = SITE_URL

type SitemapEntry = MetadataRoute.Sitemap[number]

/** 조회 실패를 빈 목록으로 바꾸면 불완전한 XML이 하루 동안 정상 응답으로 캐시된다. */
async function fetchSitemapRows<T>(query: string, tag: CacheTag): Promise<T[]> {
  const url = process.env.NEXT_PUBLIC_DB_API_URL
  const key = process.env.NEXT_PUBLIC_DB_PUBLISHABLE_KEY
  if (!url || !key) throw new Error('[sitemap] DB configuration is missing')

  const request = () => fetch(`${url}/rest/v1/${query}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
    next: { revalidate: SITEMAP_REVALIDATE_SECONDS, tags: [tag] },
    signal: AbortSignal.timeout(15000),
  })
  let response = await request()
  if (response.status === 503) response = await request()
  if (!response.ok) {
    throw new Error(`[sitemap] ${query.split('?')[0]} REST failed: ${response.status}`)
  }
  const rows: T[] = await response.json()
  if (!Array.isArray(rows)) throw new Error('[sitemap] Expected DB rows')
  return rows
}

const INDEXABLE_TIER_FILTER =
  INDEXABLE_TIERS.length === 1
    ? `eq.${INDEXABLE_TIERS[0]}`
    : `in.(${INDEXABLE_TIERS.join(',')})`

async function fetchCelebs(): Promise<{
  slug: string
  created_at: string | null
  updated_at: string | null
}[]> {
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

    const data = await fetchSitemapRows<(typeof allCelebs)[number]>(`celebs?${params}`, CACHE_TAGS.CELEBS)
    allCelebs.push(...data)
    if (data.length < pageSize) break
    offset += pageSize
  }

  return allCelebs
}

async function fetchCuratedPaths(): Promise<string[]> {
  type Curator = { slug: string; curated_lists: { slug: string; content_type: string; is_featured: boolean }[] | null }
  const data: Curator[] = []
  const pageSize = 1000
  for (let offset = 0; ; offset += pageSize) {
    const rows = await fetchSitemapRows<Curator>(
      `curators?select=slug,curated_lists(slug,content_type,is_featured)&is_featured=eq.true&order=id.asc&offset=${offset}&limit=${pageSize}`,
      CACHE_TAGS.CURATED,
    )
    data.push(...rows)
    if (rows.length < pageSize) break
  }

  // 화면과 같은 매체별 기관 수·페이지 크기·정본 규칙으로 모든 쪽을 등재한다.
  const counts = new Map<string, number>()
  for (const curator of data) {
    const medias = new Set((curator.curated_lists ?? []).filter(list => list.is_featured).map(list => list.content_type))
    for (const media of medias) counts.set(media, (counts.get(media) ?? 0) + 1)
  }
  const hubPaths = [...counts].flatMap(([media, count]) =>
    Array.from({ length: Math.ceil(count / CURATOR_PAGE_SIZE) }, (_, index) =>
      resolveCuratedHubMeta({ media, page: String(index + 1) }, counts, CURATOR_PAGE_SIZE).path,
    ),
  ).filter((path) => path !== CURATED_HUB_PATH)

  return [...hubPaths, ...data.flatMap((curator) => [
    `/explore/works/curated/${curator.slug}`,
    ...(curator.curated_lists ?? []).map(
      (list) => `/explore/works/curated/${curator.slug}/${list.slug}`,
    ),
  ])]
}

/**
 * 신화·세력 한 편의 주소(26.09.29). 화면이 여는 것과 같은 조건만 싣는다 — 신화는 공개(published),
 * 세력은 도감 노출(is_featured), 둘 다 slug가 있고 숨기지 않은 인물이 한 명 이상이다. 등재해 놓고 404를
 * 돌려주면 모순 신호다(ops-02-seo 「판정에서 굳은 원칙」 6).
 */
async function fetchAtlasPaths(): Promise<string[]> {
  type AtlasRow = { id: string; slug: string; is_myth: boolean; published: boolean; is_featured: boolean }
  const rows: AtlasRow[] = []
  const pageSize = 1000
  for (let offset = 0; ; offset += pageSize) {
    const page = await fetchSitemapRows<AtlasRow>(
      `faction_lv2?select=id,slug,is_myth,published,is_featured&slug=not.is.null&order=sort_order.asc,id.asc&offset=${offset}&limit=${pageSize}`,
      CACHE_TAGS.FACTIONS,
    )
    rows.push(...page)
    if (page.length < pageSize) break
  }

  // 인물이 있는 세력 — 뷰가 1,000행 상한에 걸리므로 끝까지 나눠 읽는다
  const withMembers = new Set<string>()
  for (let offset = 0; ; offset += pageSize) {
    const members = await fetchSitemapRows<{ lv2_id: string }>(
      `faction_member_rows?select=lv2_id&hidden=eq.false&order=lv2_id.asc,celeb_id.asc&offset=${offset}&limit=${pageSize}`,
      CACHE_TAGS.FACTIONS,
    )
    members.forEach((member) => withMembers.add(member.lv2_id))
    if (members.length < pageSize) break
  }

  return rows.flatMap((row) => {
    if (!withMembers.has(row.id)) return []
    if (row.is_myth) return row.published ? [`/explore/myth/${row.slug}`] : []
    return row.is_featured ? [`/explore/faction/${row.slug}`] : []
  })
}

function entry(
  path: string,
  changeFrequency: SitemapEntry['changeFrequency'],
  priority: number,
  lastModified?: Date,
): SitemapEntry[] {
  const { languages } = getAlternates(path)

  return Object.entries(languages).flatMap(([language, url]) => language !== 'x-default' && url ? [
    {
      url,
      ...(lastModified && { lastModified }),
      changeFrequency,
      priority,
      alternates: { languages },
    },
  ] : [])
}

const staticPaths: [string, SitemapEntry['changeFrequency'], number][] = [
  ['/', 'daily', 1],
  ['/explore', 'daily', 0.8],
  ['/explore/works/professions', 'weekly', 0.7],
  ['/explore/ranking', 'daily', 0.7],
  ['/explore/ranking?category=video', 'daily', 0.7],
  ['/explore/ranking?category=game', 'daily', 0.7],
  ['/explore/ranking?category=music', 'daily', 0.7],
  ['/explore/timeline', 'weekly', 0.7],
  ['/explore/faction', 'daily', 0.7],
  ['/explore/spectrum', 'weekly', 0.6],
  ...INFLUENCE_RANKING_FIELDS.map(
    (field): [string, SitemapEntry['changeFrequency'], number] => [getInfluenceRankingHref(field), 'weekly', 0.7],
  ),
  ['/explore/myth', 'weekly', 0.6],
  ['/explore/today', 'daily', 0.7],
  ['/explore/directory', 'weekly', 0.8],
  ['/explore/monologue', 'weekly', 0.6],
  ['/explore/feed', 'daily', 0.7],
  // 작품 첫 화면이 베스트셀러다. 옛 /explore/works/popular(베스트셀러)는 이 주소로 옮겨 가므로 싣지 않는다
  ['/explore/works', 'daily', 0.8],
  ['/explore/works/popular?mode=classics', 'weekly', 0.8],
  ['/explore/works/museum', 'monthly', 0.7],
  ['/explore/works/academy', 'monthly', 0.7],
  ['/explore/works/curated', 'weekly', 0.8],
  ['/rest', 'monthly', 0.5],
  ['/support', 'monthly', 0.5],
  ['/shop', 'monthly', 0.5],
  ['/terms', 'yearly', 0.3],
  ['/privacy', 'yearly', 0.3],
  ['/account-deletion', 'yearly', 0.3],
]

export async function getSitemapEntries(name: string): Promise<MetadataRoute.Sitemap | null> {
  if (name === 'core') {
    const professions = await getCelebProfessions()
    const [curatedPaths, atlasPaths] = await Promise.all([fetchCuratedPaths(), fetchAtlasPaths()])
    return [
      ...professions.flatMap(({ value }) => entry(`/explore/directory/${value}`, 'weekly', 0.7)),
      ...staticPaths.flatMap(([path, frequency, priority]) =>
        entry(path, frequency, priority),
      ),
      ...curatedPaths.flatMap((path) => entry(path, 'monthly', 0.7)),
      ...atlasPaths.flatMap((path) => entry(path, 'weekly', 0.6)),
    ]
  }

  if (name === 'celebs') {
    const celebs = await fetchCelebs()
    return celebs.flatMap((celeb) =>
      entry(
        getCelebProfileUrl(celeb),
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
