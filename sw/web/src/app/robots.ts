import type { MetadataRoute } from 'next'
import { MODEL_TRAINING_CRAWLERS, ROBOTS_ONLY_TRAINING_TOKENS } from '@/lib/blocked-crawlers'

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

/**
 * Google-Extended가 읽어도 되는 기본 안내. 이 토큰은 Gemini 학습과 Gemini 앱 그라운딩을
 * 함께 제어하므로(Google 검색·AI Overviews와는 무관) 서비스 소개는 열고 인물·작품 데이터는 막는다.
 * Google은 가장 긴 경로 규칙을 우선하므로 `Disallow: /` 아래에서도 이 Allow가 이긴다.
 */
const GOOGLE_EXTENDED_ALLOW = [
  '/$',
  '/en$',
  '/about',
  '/en/about',
  '/explore/directory',
  '/en/explore/directory',
  '/privacy',
  '/en/privacy',
  '/terms',
  '/en/terms',
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
  '/*/reading',
  '/*/chamber',
  '/*/merits',
  // 광장 글쓰기·수정 화면은 로그인해야 열리고 색인 가치가 없는데 크롤만 먹는다.
  // 광장 목록·본문은 막지 않는다. 레이아웃 noindex(2026-07-15)를 구글이 읽어야
  // 색인에서 빠지므로, robots로 끊으면 오히려 URL만 남는다.
  '/agora/*/write',
  '/en/agora/*/write',
  '/agora/*/edit',
  '/en/agora/*/edit',
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
      // 모델 학습·대량 수집 크롤러: 전 경로 차단 (UA 명단 + robots 전용 토큰)
      {
        userAgent: [...MODEL_TRAINING_CRAWLERS, ...ROBOTS_ONLY_TRAINING_TOKENS],
        disallow: '/',
      },
      // Google-Extended: 기본 안내만 허용. Gemini 학습·그라운딩 모두 이 범위로 제한된다.
      {
        userAgent: 'Google-Extended',
        allow: GOOGLE_EXTENDED_ALLOW,
        disallow: '/',
      },
    ],
    sitemap: 'https://feelandnote.com/sitemap.xml',
  }
}
