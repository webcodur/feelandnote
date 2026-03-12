import type { MetadataRoute } from 'next'

export const revalidate = 3600

const BASE_URL = 'https://feelandnote.com'

/** Supabase REST API로 직접 fetch (supabase-js 의존 제거) */
async function fetchCelebs(): Promise<{ slug: string; updated_at: string | null }[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return []

  const allCelebs: { slug: string; updated_at: string | null }[] = []
  const PAGE_SIZE = 1000
  let offset = 0

  while (true) {
    const params = new URLSearchParams({
      select: 'slug,updated_at',
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
): MetadataRoute.Sitemap[number] {
  const normalizedPath = path === '/' ? '' : path
  return {
    url: `${BASE_URL}${normalizedPath}`,
    lastModified: lastModified ?? new Date(),
    changeFrequency,
    priority,
    alternates: {
      languages: {
        ko: `${BASE_URL}${normalizedPath}`,
        en: `${BASE_URL}/en${normalizedPath}`,
        'x-default': `${BASE_URL}${normalizedPath}`,
      },
    },
  }
}

const staticEntries: MetadataRoute.Sitemap = [
  entry('/', 'daily', 1),

  // 탐색
  entry('/explore', 'daily', 0.8),
  entry('/explore/figures', 'daily', 0.8),
  entry('/explore/celebs', 'daily', 0.8),
  entry('/explore/people', 'daily', 0.6),
  entry('/explore/ranking', 'daily', 0.7),
  entry('/explore/timeline', 'weekly', 0.7),
  entry('/explore/spotlight', 'daily', 0.7),
  entry('/explore/persona', 'weekly', 0.6),
  entry('/explore/figure', 'weekly', 0.6),
  entry('/explore/celeb-feed', 'daily', 0.7),
  entry('/explore/top-by-type', 'weekly', 0.6),
  entry('/explore/today', 'daily', 0.7),
  entry('/explore/directory', 'weekly', 0.8),
  entry('/explore/feed', 'daily', 0.7),

  // 경전
  entry('/scriptures', 'daily', 0.8),
  entry('/scriptures/era', 'weekly', 0.8),
  entry('/scriptures/museum', 'monthly', 0.7),
  entry('/scriptures/academy', 'monthly', 0.7),
  entry('/scriptures/profession', 'weekly', 0.7),
  entry('/scriptures/figure', 'weekly', 0.6),

  // 아고라
  entry('/agora', 'daily', 0.7),

  // 기타
  entry('/rest', 'monthly', 0.5),
  entry('/about', 'monthly', 0.5),
  entry('/terms', 'yearly', 0.3),
  entry('/privacy', 'yearly', 0.3),
  entry('/contact', 'yearly', 0.3),
]

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const celebs = await fetchCelebs()

  const celebEntries = celebs.map((celeb) =>
    entry(`/celeb/${celeb.slug}`, 'weekly', 0.7, celeb.updated_at ? new Date(celeb.updated_at) : undefined),
  )

  return [...staticEntries, ...celebEntries]
}
