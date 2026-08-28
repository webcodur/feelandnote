/*
  파일명: /lib/rawFetch.ts
  기능: Next.js가 패치하기 전의 원본 fetch
  책임: 서버에서 Supabase 조회·외부 이미지 수집처럼 Next의 fetch 캐시·중복제거가 필요 없는 호출이
        패치된 fetch를 타지 않게 한다. 패치된 fetch는 응답을 React cache 노드(`[key, Promise,
        Response]`)에 요청 단위로 보관하는데, 요청 컨텍스트가 붙들리면 그 응답들이 본문째 남는다
        (26.08.28 운영 heap 누수 — 붙든 주체는 supabase-js 의 토큰 자동갱신 타이머였고 그 수정은
        `lib/supabase/static.ts` 머리말). 캐시는 unstable_cache 가 맡으므로 이 경로를 우회해도
        잃는 것이 없다.
*/ // ------------------------------

type FetchLike = typeof globalThis.fetch

/** 패치 시점이 모듈 평가보다 늦을 수 있어 호출 때마다 찾는다 */
function resolveRawFetch(): FetchLike {
  const g = globalThis as typeof globalThis & { _nextOriginalFetch?: FetchLike }
  return g._nextOriginalFetch ?? g.fetch
}

export const rawFetch: FetchLike = (input, init) => resolveRawFetch().call(globalThis, input, init)
