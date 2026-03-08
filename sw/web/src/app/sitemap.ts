import type { MetadataRoute } from 'next'
import { createClient } from '@/lib/supabase/server'

const BASE_URL = 'https://feelandnote.com'

/** 각 경로에 대해 ko(기본) + en alternates를 포함하는 sitemap 엔트리 생성 */
function entry(
  path: string,
  changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'],
  priority: number,
): MetadataRoute.Sitemap[number] {
  const normalizedPath = path === '/' ? '' : path
  return {
    url: `${BASE_URL}${normalizedPath}`,
    lastModified: new Date(),
    changeFrequency,
    priority,
    alternates: {
      languages: {
        ko: `${BASE_URL}${normalizedPath}`,
        en: `${BASE_URL}/en${normalizedPath}`,
      },
    },
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // 정적 라우트
  const staticRoutes = [
    entry('/', 'daily', 1),
    entry('/explore', 'daily', 0.8),
    entry('/explore/figures', 'daily', 0.8),
    entry('/explore/people', 'daily', 0.6),
    entry('/scriptures', 'daily', 0.8),
    entry('/scriptures/era', 'weekly', 0.8),
    entry('/scriptures/museum', 'monthly', 0.7),
    entry('/scriptures/academy', 'monthly', 0.7),
    entry('/explore/today', 'daily', 0.7),
    entry('/scriptures/profession', 'weekly', 0.7),
    entry('/agora', 'daily', 0.7),
    entry('/explore/feed', 'daily', 0.7),
    entry('/rest', 'monthly', 0.5),
    entry('/about', 'monthly', 0.5),
    entry('/terms', 'yearly', 0.3),
    entry('/privacy', 'yearly', 0.3),
    entry('/contact', 'yearly', 0.3),
  ]

  // 셀럽 동적 라우트
  const supabase = await createClient()
  const { data: celebs } = await supabase
    .from('profiles')
    .select('slug')
    .eq('profile_type', 'CELEB')
    .eq('status', 'active')
    .not('slug', 'is', null)

  const celebRoutes = (celebs ?? []).map((celeb) =>
    entry(`/celeb/${celeb.slug}`, 'weekly', 0.7),
  )

  return [...staticRoutes, ...celebRoutes]
}
