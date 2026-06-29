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
]

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // 일반 검색 크롤러: 콘텐츠는 열되 과도한 크롤 속도는 늦춘다(crawlDelay 준수 봇 한정)
      {
        userAgent: '*',
        allow: '/',
        disallow: COMMON_DISALLOW,
        crawlDelay: 10,
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
