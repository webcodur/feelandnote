/*
  파일명: /lib/rawFetch.ts
  기능: Next.js fetch 캐시·중복 제거 우회
  책임: 서버에서 PostgREST 조회·외부 이미지 수집처럼 Next의 fetch 캐시·중복제거가 필요 없는 호출이
        패치된 fetch를 타지 않게 한다. 패치된 fetch는 응답을 React cache 노드(`[key, Promise,
        Response]`)에 요청 단위로 보관하는데, 요청 컨텍스트가 붙들리면 그 응답들이 본문째 남는다
        (26.08.28 운영 heap 누수 — 붙든 주체는 supabase-js 의 토큰 자동갱신 타이머였고 그 수정은
        `lib/db/static.ts` 머리말). 공개 데이터 캐시는 unstable_cache 가 맡는다.
*/ // ------------------------------

type FetchLike = typeof globalThis.fetch
type PatchedFetch = FetchLike & { _nextOriginalFetch?: FetchLike }

/** 패치 시점이 모듈 평가보다 늦을 수 있어 호출 때마다 찾는다 */
function resolveRawFetch(): FetchLike {
  const current = globalThis.fetch as PatchedFetch
  return current._nextOriginalFetch ?? current
}

export const rawFetch: FetchLike = (input, init) => {
  // Next 16의 _nextOriginalFetch도 dedupe 래퍼다. 명시적인 signal이 있어야
  // React cache에 Response를 복제·보관하지 않고 실제 fetch까지 통과한다.
  // Request의 취소를 유지하되 init.signal의 명시적 null은 fetch 규약대로 초기화한다.
  const signal = init?.signal === undefined && input instanceof Request
    ? input.signal
    : init?.signal ?? new AbortController().signal

  return resolveRawFetch().call(globalThis, input, { ...init, signal })
}
