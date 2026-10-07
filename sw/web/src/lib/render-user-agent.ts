/* 요청 헤더에 의존하지 않는 판정. 화면 렌더·메타데이터·앞단 캐시에서 공유한다. */

/* ────────────────────────────────────────────────────────────────
   봇 서명

   크롤러·미리보기 수집기·자동화 도구를 담는다. 브라우저 서명을 함께 쓰는
   알려진 봇도 완성 HTML을 받게 한다.
   ──────────────────────────────────────────────────────────────── */
export const BOT_SIGNATURES = [
  // 일반 크롤러 어휘
  'bot', 'crawl', 'spider', 'slurp', 'scrap', 'preview', 'fetch',
  // 검색 엔진
  'googlebot', 'google-', '-google', 'bingbot', 'yeti', 'daum/', 'applebot',
  'duckduckbot', 'yandexbot', 'baiduspider', 'petalbot', 'bytespider',
  // 생성 모델 수집기
  'gptbot', 'claudebot', 'ccbot', 'perplexitybot', 'oai-searchbot',
  'chatgpt-user', 'claude-user', 'perplexity-user', 'amzn-user',
  // 링크 미리보기
  'facebookexternalhit', 'twitterbot', 'linkedinbot', 'discordbot',
  'telegrambot', 'whatsapp', 'slackbot', 'embedly', 'skypeuripreview',
  'kakaotalk-scrap', 'facebookcatalog', 'vkshare', 'tumblr', 'ia_archiver', 'sogou', 'googleweblight',
  // 자동화 도구·계측
  'curl', 'wget', 'python', 'go-http-client',
  'java/', 'okhttp', 'axios', 'headless', 'phantomjs',
  'puppeteer', 'playwright', 'lighthouse', 'pagespeed',
  'vercel', 'monitoring', 'uptime', 'pingdom',
] as const

/* 공유 HTML 캐시에서 확인하는 브라우저 서명. 스트리밍의 허용 목록은 아니다. */
export const BROWSER_SIGNATURES = [
  'chrome', 'crios', 'safari', 'firefox', 'fxios',
  'edg', 'samsungbrowser', 'whale', 'opr',
] as const

export const BOT_USER_AGENT_RE = new RegExp(
  BOT_SIGNATURES.map(signature => signature.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'),
  'i',
)

/** 알려진 봇·자동화 도구 서명이 있는지. 미확인·빈 UA를 봇으로 추정하지 않는다. */
export function isBotUserAgent(ua: string | null): boolean {
  const value = ua?.trim().toLowerCase()
  if (!value) return false
  return BOT_USER_AGENT_RE.test(value)
}

/**
 * 공유 HTML 캐시에 사용할 수 있는 확인된 브라우저인지.
 *
 * 봇 서명이 하나라도 있으면 브라우저 서명이 함께 있어도 봇이다 — Googlebot 스마트폰 UA는
 * Chrome·Safari 서명을 그대로 달고 온다.
 */
export function isHumanBrowserUserAgent(ua: string | null): boolean {
  if (isBotUserAgent(ua)) return false
  const value = (ua ?? '').toLowerCase()
  return BROWSER_SIGNATURES.some(signature => value.includes(signature))
}

/** 사용자 첫 화면을 우선한다. 알려진 봇만 완성 HTML을 기다린다. */
export function shouldStreamForUserAgent(ua: string | null): boolean {
  return !isBotUserAgent(ua)
}
