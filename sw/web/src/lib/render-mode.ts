/*
  파일명: /lib/render-mode.ts
  기능: 요청 UA로 "완성 HTML"과 "구획별 스트리밍"을 가른다
  책임: 알려진 봇은 완성 HTML을 받고, 나머지 요청은 준비된 구획부터 표시한다.
        사용자 이탈 방지를 우선하므로 미확인·빈 UA도 스트리밍한다.
        공유 HTML 캐시의 브라우저 확인은 렌더링 기본값과 별도로 유지한다.
*/ // ------------------------------

import { headers } from 'next/headers'

import { shouldStreamForUserAgent } from './render-user-agent'
export { BOT_SIGNATURES, BROWSER_SIGNATURES, isBotUserAgent, isHumanBrowserUserAgent, shouldStreamForUserAgent } from './render-user-agent'

/** 요청별 렌더 판단. 완성 HTML의 정적 ISR을 유지하는 화면에서는 호출하지 않는다. */
export async function shouldStreamForRequest(): Promise<boolean> {
  const headerList = await headers()
  return shouldStreamForUserAgent(headerList.get('user-agent'))
}
