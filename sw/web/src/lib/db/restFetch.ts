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
  return async (input, init) => {
    const started = performance.now()
    const signal = init?.signal ?? AbortSignal.timeout(timeoutMs)
    const options = { ...init, signal }
    const response = await rawFetch(input, options)
    const elapsedMs = Math.round(performance.now() - started)
    if (elapsedMs > 1_000) {
      const url = input instanceof Request ? input.url : String(input)
      console.warn(JSON.stringify({ tag: 'feelandnote-query', path: new URL(url).pathname,
        ms: elapsedMs, status: response.status }))
    }
    const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase()

    // Envoy가 응답 헤더를 받기 전에 upstream 연결을 잃은 경우만 복구한다.
    // 쓰기/RPC, pool 포화(PGRST003), no healthy upstream, timeout은 재시도하지 않는다.
    if (method !== 'GET' || response.status !== 503 || signal.aborted) return response
    const body = await response.clone().text()
    if (!body.includes('upstream connect error or disconnect/reset before headers.') ||
        !body.includes('reset reason: connection termination')) return response

    await response.body?.cancel()
    signal.throwIfAborted()
    // 같은 signal을 써서 첫 시도의 대기 시간까지 전체 제한에 포함한다.
    return rawFetch(input, options)
  }
}

export const restFetch = createRestFetch()
