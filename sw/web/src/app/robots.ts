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
      ],
    },
    sitemap: 'https://feelandnote.com/sitemap.xml',
  }
}
