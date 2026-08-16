import type { MetadataRoute } from 'next'
import { MODEL_TRAINING_CRAWLERS } from '@/lib/blocked-crawlers'

/** 검색·답변 노출과 사용자 요청에 쓰이는 봇. 학습용 봇과 분리해 공개 문서만 허용한다. */
const ANSWER_CRAWLERS = [
  'OAI-SearchBot',
  'ChatGPT-User',
  'Claude-SearchBot',
  'Claude-User',
  'PerplexityBot',
  'Perplexity-User',
  'Amzn-SearchBot',
  'Amzn-User',
  'YouBot',
]

// 학습·대량 수집 크롤러 명단은 미들웨어(403)와 공유한다 — lib/blocked-crawlers.ts

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
      // 답변 엔진도 일반 검색엔진과 같은 공개 범위만 읽는다.
      // 각 회사의 검색용 UA를 학습용 UA와 분리해야 검색·인용 후보에서 빠지지 않는다.
      {
        userAgent: ANSWER_CRAWLERS,
        allow: '/',
        disallow: COMMON_DISALLOW,
        crawlDelay: 1,
      },
      // 일반 검색 크롤러: 콘텐츠는 열되 과도한 크롤 속도는 늦춘다(crawlDelay 준수 봇 한정)
      // 10은 2,996 URL 사이트의 Bing·네이버 색인을 지나치게 늦춰 1로 완화(2026-07-14)
      {
        userAgent: '*',
        allow: '/',
        disallow: COMMON_DISALLOW,
        crawlDelay: 1,
      },
      // 모델 학습·대량 수집 크롤러: 전 경로 차단
      {
        userAgent: [...MODEL_TRAINING_CRAWLERS],
        disallow: '/',
      },
    ],
    sitemap: 'https://feelandnote.com/sitemap.xml',
  }
}
