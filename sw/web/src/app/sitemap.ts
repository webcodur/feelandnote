import type { MetadataRoute } from 'next'
import { createClient } from '@/lib/supabase/server'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://feelandnote.com'

  // 정적 라우트 (Static Routes)
  const routes = [
    '',
    '/explore',
    '/scriptures',
    '/agora',
    '/rest',
    '/about',
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: route === '' ? 1 : 0.8,
  }))

  // 셀럽 동적 라우트
  const supabase = await createClient()
  const { data: celebs } = await supabase
    .from('profiles')
    .select('slug')
    .eq('profile_type', 'CELEB')
    .eq('status', 'active')
    .not('slug', 'is', null)

  const celebRoutes = (celebs ?? []).map((celeb) => ({
    url: `${baseUrl}/celeb/${celeb.slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }))

  return [...routes, ...celebRoutes]
}
