import type { MetadataRoute } from 'next'

export const revalidate = 3600

const BASE_URL = 'https://feelandnote.com'

/** Supabase REST API로 직접 fetch (supabase-js 의존 제거) */
async function fetchCelebs(): Promise<{ slug: string; created_at: string | null }[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return []

  const allCelebs: { slug: string; created_at: string | null }[] = []
  const PAGE_SIZE = 1000
  let offset = 0

  while (true) {
    const params = new URLSearchParams({
      select: 'slug,created_at',
      profile_type: 'eq.CELEB',
      status: 'eq.active',
      slug: 'not.is.null',
      order: 'created_at.asc',
      offset: String(offset),
      limit: String(PAGE_SIZE),
    })

    const res = await fetch(`${url}/rest/v1/profiles?${params}`, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
      next: { revalidate: 3600 },
    })

    if (!res.ok) {
      console.error(`[sitemap] Supabase REST failed: ${res.status} ${res.statusText}`)
      break
    }

    const data = await res.json()
    allCelebs.push(...data)

    if (data.length < PAGE_SIZE) break
    offset += PAGE_SIZE
  }

  return allCelebs
}

function entry(
  path: string,
  changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'],
  priority: number,
  lastModified?: Date,
): MetadataRoute.Sitemap[number][] {
  const normalizedPath = path === '/' ? '' : path
  const modified = lastModified ?? new Date()
  const langs = {
    ko: `${BASE_URL}${normalizedPath}`,
    en: `${BASE_URL}/en${normalizedPath}`,
    'x-default': `${BASE_URL}${normalizedPath}`,
  }
  return [
    { url: langs.ko, lastModified: modified, changeFrequency, priority, alternates: { languages: langs } },
    { url: langs.en, lastModified: modified, changeFrequency, priority, alternates: { languages: langs } },
  ]
}

const staticPaths: [string, MetadataRoute.Sitemap[number]['changeFrequency'], number][] = [
  ['/', 'daily', 1],
  // 탐색
  ['/explore', 'daily', 0.8],
  ['/explore/figures', 'daily', 0.8],
  ['/explore/celebs', 'daily', 0.8],
  ['/explore/people', 'daily', 0.6],
  ['/explore/ranking', 'daily', 0.7],
  ['/explore/timeline', 'weekly', 0.7],
  ['/explore/spotlight', 'daily', 0.7],
  ['/explore/persona', 'weekly', 0.6],
  ['/explore/figure', 'weekly', 0.6],
  ['/explore/celeb-feed', 'daily', 0.7],
  ['/explore/top-by-type', 'weekly', 0.6],
  ['/explore/today', 'daily', 0.7],
  ['/explore/directory', 'weekly', 0.8],
  ['/explore/feed', 'daily', 0.7],
  // 서가
  ['/library', 'daily', 0.8],
  ['/library/era', 'weekly', 0.8],
  ['/library/museum', 'monthly', 0.7],
  ['/library/academy', 'monthly', 0.7],
  ['/library/profession', 'weekly', 0.7],
  ['/library/figure', 'weekly', 0.6],
  // 아고라
  ['/agora', 'daily', 0.7],
  // 기타
  ['/rest', 'monthly', 0.5],
  ['/terms', 'yearly', 0.3],
  ['/privacy', 'yearly', 0.3],
  ['/contact', 'yearly', 0.3],
]

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const celebs = await fetchCelebs()

  const staticEntries = staticPaths.flatMap(([path, freq, priority]) => entry(path, freq, priority))
  const celebEntries = celebs.flatMap((celeb) =>
    entry(`/celeb/${celeb.slug}`, 'weekly', 0.7, celeb.created_at ? new Date(celeb.created_at) : undefined),
  )

  return [...staticEntries, ...celebEntries]
}
