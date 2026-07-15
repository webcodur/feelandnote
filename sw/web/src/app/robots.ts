import type { MetadataRoute } from 'next'

/**
 * 검색 노출과 무관한 AI 학습·수집용 크롤러.
 * 사람 트래픽이 거의 없는 사이트에서 이들의 전수 반복 크롤은 순수 데이터 전송 비용(egress)만
 * 발생시키고 검색 유입에는 기여하지 않으므로 전면 차단한다.
 */
const AI_CRAWLERS = [
  'GPTBot',
  'ChatGPT-User',
  'OAI-SearchBot',
  'ClaudeBot',
  'anthropic-ai',
  'Claude-Web',
  'CCBot',
  'Google-Extended',
  'Applebot-Extended',
  'Bytespider',
  'Amazonbot',
  'PerplexityBot',
  'meta-externalagent',
  'FacebookBot',
  'Diffbot',
  'ImagesiftBot',
  'Omgilibot',
  'cohere-ai',
  'YouBot',
  'DataForSeoBot',
]

const COMMON_DISALLOW = [
  '/private/',
  '/admin/',
  '/api/',
  '/notifications',
  '/en/notifications',
  '/login',
  '/en/login',
  '/signup',
  '/en/signup',
  '/reset-password',
  '/en/reset-password',
  '/search',
  '/en/search',
  '/lab',
  '/reading',
  '/*/reading',
  '/*/chamber',
  '/*/merits',
  // 무한 조합을 만드는 파라미터만 차단한다. '/*?' 전면 차단은 ?category= 붙은
  // 콘텐츠 상세 내부 링크까지 전부 크롤 불가로 만들어 색인 실패의 원인이 됐다(2026-07-14)
  '/*?*search=',
  '/*?*sortBy=',
  '/*?*sort=',
  '/*?*page=',
]

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // 일반 검색 크롤러: 콘텐츠는 열되 과도한 크롤 속도는 늦춘다(crawlDelay 준수 봇 한정)
      // 10은 2,996 URL 사이트의 Bing·네이버 색인을 지나치게 늦춰 1로 완화(2026-07-14)
      {
        userAgent: '*',
        allow: '/',
        disallow: COMMON_DISALLOW,
        crawlDelay: 1,
      },
      // AI 학습·수집 크롤러: 전 경로 차단
      {
        userAgent: AI_CRAWLERS,
        disallow: '/',
      },
    ],
    sitemap: 'https://feelandnote.com/sitemap.xml',
  }
}
