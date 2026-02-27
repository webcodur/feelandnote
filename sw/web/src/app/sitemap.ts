import type { MetadataRoute } from 'next'
import { createClient } from '@/lib/supabase/server'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://feelandnote.com'

  // 정적 라우트
  const staticRoutes = [
    { path: '', priority: 1, changeFrequency: 'daily' as const },
    { path: '/explore', priority: 0.8, changeFrequency: 'daily' as const },
    { path: '/explore/celebs', priority: 0.8, changeFrequency: 'daily' as const },
    { path: '/explore/people', priority: 0.6, changeFrequency: 'daily' as const },
    { path: '/scriptures', priority: 0.8, changeFrequency: 'daily' as const },
    { path: '/scriptures/era', priority: 0.8, changeFrequency: 'weekly' as const },
    { path: '/scriptures/history', priority: 0.7, changeFrequency: 'monthly' as const },
    { path: '/scriptures/figure', priority: 0.7, changeFrequency: 'daily' as const },
    { path: '/scriptures/profession', priority: 0.7, changeFrequency: 'weekly' as const },
    { path: '/agora', priority: 0.7, changeFrequency: 'daily' as const },
    { path: '/agora/celeb-feed', priority: 0.7, changeFrequency: 'daily' as const },
    { path: '/rest', priority: 0.5, changeFrequency: 'monthly' as const },
    { path: '/about', priority: 0.5, changeFrequency: 'monthly' as const },
    { path: '/terms', priority: 0.3, changeFrequency: 'yearly' as const },
    { path: '/privacy', priority: 0.3, changeFrequency: 'yearly' as const },
  ].map(({ path, priority, changeFrequency }) => ({
    url: `${baseUrl}${path}`,
    lastModified: new Date(),
    changeFrequency,
    priority,
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

  return [...staticRoutes, ...celebRoutes]
}
