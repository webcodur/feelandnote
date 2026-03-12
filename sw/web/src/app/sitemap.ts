import type { MetadataRoute } from 'next'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const revalidate = 3600 // 1시간 캐시

const BASE_URL = 'https://feelandnote.com'

function createRuntimeClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
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
  const supabase = createRuntimeClient()
  const { data: celebs } = await supabase
    .from('profiles')
    .select('slug, updated_at')
    .eq('profile_type', 'CELEB')
    .eq('status', 'active')
    .not('slug', 'is', null)
    .order('created_at', { ascending: true })

  const celebEntries = (celebs ?? []).map((celeb) =>
    entry(`/celeb/${celeb.slug}`, 'weekly', 0.7, celeb.updated_at ? new Date(celeb.updated_at) : undefined),
  )

  return [...staticEntries, ...celebEntries]
}
