/*
  파일명: /lib/blocked-crawlers.ts
  기능: 검색 노출과 무관한 AI 모델 학습·대량 수집 크롤러 명단(단일 원천)
  책임: robots.txt(선언)와 미들웨어(강제 403)가 같은 명단을 쓴다. robots는 권고일 뿐이라
        Bytespider류는 무시한다 — 미들웨어가 요청을 끊어야 상세 페이지 ISR 생성 비용이 안 든다.
        검색·답변용 봇(OAI-SearchBot·PerplexityBot 등)은 여기 넣지 않는다.
*/ // ------------------------------

export const MODEL_TRAINING_CRAWLERS = [
  'GPTBot',
  'ClaudeBot',
  'anthropic-ai',
  'Claude-Web',
  'CCBot',
  'Google-Extended',
  'Applebot-Extended',
  'Bytespider',
  'Amazonbot',
  'meta-externalagent',
  'FacebookBot',
  'Diffbot',
  'ImagesiftBot',
  'Omgilibot',
  'cohere-ai',
  'DataForSeoBot',
  // 26.08.16 Firewall 실측 — 하루 2.2k·1.4k 요청으로 상세 페이지를 훑던 마케팅·SEO 수집기
  'AwarioBot',
  'AhrefsBot',
  'SemrushBot',
  'MJ12bot',
  'DotBot',
  'PetalBot',
] as const

const LOWER = MODEL_TRAINING_CRAWLERS.map((name) => name.toLowerCase())

/** UA가 차단 명단의 크롤러인지. 대소문자 무시. */
export function isBlockedCrawler(userAgent: string | null): boolean {
  if (!userAgent) return false
  const ua = userAgent.toLowerCase()
  return LOWER.some((name) => ua.includes(name))
}
