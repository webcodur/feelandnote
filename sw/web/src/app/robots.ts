import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/private/',
        '/admin/',
        '/api/',
        '/notifications',
        '/login',
        '/signup',
        '/reset-password',
        '/search',
        '/lab',
        '/reading',
        '/*/reading',
        '/*/chamber',
        '/*/merits',
        '/*?', // 필터·검색 쿼리스트링 조합 크롤링 차단 (캐시 미스 폭증 방지)
      ],
    },
    sitemap: 'https://feelandnote.com/sitemap.xml',
  }
}
