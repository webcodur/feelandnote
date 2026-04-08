/**
 * safePrefetch — prefetch 실패 시 어떤 URL이 빠졌는지 노출하는 래퍼
 *
 * Remotion 기본 prefetch는 실패 시 `HTTP error, status = 404`만 던져
 * Studio 오버레이에서 어떤 파일이 없는지 식별이 불가능하다.
 * 이 래퍼는 waitUntilDone()의 거부를 가로채 URL과 원인을 명시한다.
 *
 * 환경별 동작:
 * - 렌더링: throw — 렌더 산출물에 빠진 리소스를 즉시 파이프라인에서 차단
 * - 스튜디오: console.error만 — 리소스가 부분적으로 빠진 에피소드도 미리보기 가능
 */
import { getRemotionEnvironment, prefetch } from 'remotion'

type PrefetchOptions = Parameters<typeof prefetch>[1]
type PrefetchHandle = ReturnType<typeof prefetch>

export const safePrefetch = (url: string, options?: PrefetchOptions): PrefetchHandle => {
  const handle = prefetch(url, options)
  handle.waitUntilDone().catch((err: unknown) => {
    const detail = err instanceof Error ? err.message : String(err)
    // free()로 인한 abort는 정상 흐름이므로 무시
    if (detail.includes('free() called') || detail.includes('aborted')) return
    const msg = `[prefetch 실패] ${url}\n  → ${detail}`
    console.error(msg)
    // 렌더링 중에는 throw — 산출물 결함을 사전에 차단
    if (getRemotionEnvironment().isRendering) {
      throw new Error(msg)
    }
    // 스튜디오에서는 throw하지 않는다 — 부분 리소스 에피소드 미리보기 허용
  })
  return handle
}
