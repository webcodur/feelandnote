/*
  파일명: /lib/render-mode.ts
  기능: 요청 UA로 "완성 HTML"과 "구획별 스트리밍"을 가른다
  책임: 봇·미확인 UA는 지금처럼 전부 기다린 완성 HTML을 받고(스켈레톤을 본문으로 읽힌 사고 이력은
        docs/project/operations/seo.md), 사람 브라우저만 구획별 스트리밍을 받게 판정한다.
        판정 기본값은 "모르면 봇"이다 — 잘못 사람으로 보면 색인이 깨지고, 잘못 봇으로 보면 조금 느릴 뿐이다.
*/ // ------------------------------

import { headers } from 'next/headers'

/* ────────────────────────────────────────────────────────────────
   봇 서명

   크롤러·미리보기 수집기·자동화 도구를 모두 담는다. 사람 브라우저 UA에
   우연히 섞이면 그 사람은 스트리밍 대신 완성 HTML을 받을 뿐이라 손해가 없다.
   ──────────────────────────────────────────────────────────────── */
const BOT_SIGNATURES = [
  // 일반 크롤러 어휘
  'bot', 'crawl', 'spider', 'slurp', 'scrap', 'preview', 'fetch',
  // 검색 엔진
  'googlebot', 'bingbot', 'yeti', 'naver', 'daum', 'kakao', 'applebot',
  'duckduckbot', 'yandexbot', 'baiduspider', 'petalbot', 'bytespider',
  // 생성 모델 수집기
  'gptbot', 'claudebot', 'ccbot', 'perplexitybot', 'oai-searchbot',
  // 링크 미리보기
  'facebookexternalhit', 'twitterbot', 'linkedinbot', 'discordbot',
  'telegrambot', 'whatsapp', 'slackbot', 'embedly', 'skypeuripreview',
  // 자동화 도구·계측
  'curl', 'wget', 'python', 'go-http-client',
  'java/', 'okhttp', 'axios', 'headless', 'phantomjs',
  'puppeteer', 'playwright', 'lighthouse', 'pagespeed',
  'vercel', 'monitoring', 'uptime', 'pingdom',
] as const

/* 사람이 직접 쓰는 브라우저 서명. 이 중 하나도 없으면 사람으로 보지 않는다. */
const BROWSER_SIGNATURES = [
  'chrome', 'crios', 'safari', 'firefox', 'fxios',
  'edg', 'samsungbrowser', 'whale', 'opr',
] as const

/** UA가 봇·자동화 도구인지. UA가 없거나 비어 있으면 봇으로 본다. */
export function isBotUserAgent(ua: string | null): boolean {
  const value = ua?.trim().toLowerCase()
  if (!value) return true
  return BOT_SIGNATURES.some(signature => value.includes(signature))
}

/**
 * UA가 사람이 보고 있는 브라우저인지.
 *
 * 봇 서명이 하나라도 있으면 브라우저 서명이 함께 있어도 봇이다 — Googlebot 스마트폰 UA는
 * Chrome·Safari 서명을 그대로 달고 온다.
 */
export function isHumanBrowserUserAgent(ua: string | null): boolean {
  if (isBotUserAgent(ua)) return false
  const value = (ua ?? '').toLowerCase()
  return BROWSER_SIGNATURES.some(signature => value.includes(signature))
}

/**
 * 이번 요청을 구획별로 흘려보내도 되는지. **서버 전용**(요청 헤더를 읽는다).
 *
 * 이걸 부르면 그 화면은 동적으로 바뀐다. ISR로 굳혀 두는 화면(인물·작품 상세)에서는 쓰지 않는다.
 */
export async function shouldStreamForRequest(): Promise<boolean> {
  const headerList = await headers()
  return isHumanBrowserUserAgent(headerList.get('user-agent'))
}
