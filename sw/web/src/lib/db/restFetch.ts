/*
  파일명: /lib/db/restFetch.ts
  기능: 서버용 PostgREST 호출의 응답 대기 상한
  책임: 서버 클라이언트(static·admin)가 REST를 부를 때 호출자가 signal을 주지 않으면 시간 제한을
        건다. 2026-09-10 장애에서 PostgREST가 연결만 받고 처리하지 못하자 서버 조회가 제한 없이
        기다리다 Cloudflare 504(100초)를 받았고, 그동안 화면은 스켈레톤으로 남았다.
        Next 캐시 우회는 그대로 `lib/rawFetch.ts`가 맡는다.
*/ // ------------------------------

import { rawFetch } from '../rawFetch'

/**
 * PostgREST 응답 대기 상한(ms).
 * 정상 최악 경로는 풀 대기 10초 + anon statement_timeout 15초다. 그보다 길면 API 계층이 멎은 것이다.
 */
export const REST_TIMEOUT_MS = 30_000

/** 호출자가 signal을 주지 않은 요청에만 시간 제한을 건다. 명시적 signal은 그대로 쓴다. */
export function createRestFetch(timeoutMs: number = REST_TIMEOUT_MS): typeof fetch {
  return (input, init) =>
    rawFetch(input, { ...init, signal: init?.signal ?? AbortSignal.timeout(timeoutMs) })
}

export const restFetch = createRestFetch()

/**
 * postgrest-js는 503과 네트워크 오류를 1·2·4초 간격으로 세 번 더 시도한다. 풀이 포화된 PostgREST에
 * 재시도는 부하를 4배로 만들고 응답만 7초 늦춘다. supabase-js가 이 옵션을 넘기지 않으므로
 * REST 클라이언트에 직접 끈다. 서버 조회의 실패는 `throwOnQueryError`·`withQueryFallback`이 받는다.
 */
export function withoutRestRetry<T>(client: T): T {
  ;(client as unknown as { rest: { retry?: boolean } }).rest.retry = false
  return client
}
