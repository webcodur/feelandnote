import type { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
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

  return [...routes]
}
