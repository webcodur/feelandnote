/*
  파일명: /lib/rawFetch.ts
  기능: Next.js가 패치하기 전의 원본 fetch
  책임: 서버에서 Supabase 조회·외부 이미지 수집처럼 Next의 fetch 캐시·중복제거가 필요 없는 호출이
        패치된 fetch를 타지 않게 한다. 26.08.28 운영 heap 스냅샷 대조에서 Next의 fetch 중복제거
        캐시(React cache 노드의 `[key, Promise, Response]` 항목)가 요청이 끝나도 응답 객체를
        본문 버퍼째 붙들어 시간당 약 280MB 씩 RSS 가 늘고 6시간마다 heap OOM 이 났다.
        캐시는 unstable_cache 가 맡으므로 이 경로를 우회해도 잃는 것이 없다.
*/ // ------------------------------

type FetchLike = typeof globalThis.fetch

/** 패치 시점이 모듈 평가보다 늦을 수 있어 호출 때마다 찾는다 */
function resolveRawFetch(): FetchLike {
  const g = globalThis as typeof globalThis & { _nextOriginalFetch?: FetchLike }
  return g._nextOriginalFetch ?? g.fetch
}

export const rawFetch: FetchLike = (input, init) => resolveRawFetch().call(globalThis, input, init)
