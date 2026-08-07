/*
  파일명: /lib/cache.ts
  기능: 캐시 만료 시간 상수 + 조회 실패가 캐시에 박히지 않게 하는 두 도우미
  책임: 셀럽 정적 데이터 캐시 만료 주기를 단일 지점에서 관리하고,
        캐시되는 조회가 실패를 "정상 빈 결과"로 굳히지 않도록 강제한다.
*/ // ------------------------------

/**
 * 셀럽 정적 데이터 캐시 만료 (초). 7일.
 *
 * 일반 사용자 활동으로는 변하지 않고, 운영자가 백오피스에서 셀럽/콘텐츠 데이터를
 * 넣거나 고칠 때만 변하는 데이터에 적용한다.
 *
 * 데이터 투입 시 web-bo가 저장한 도메인의 태그(CACHE_TAGS — celebs·contents·dialogues·persona·tags)만
 * 골라 즉시 무효화하므로, 이 값은 무효화 누락에 대비한 안전망이다. (= 최악의 경우 7일 내 자동 갱신)
 * 각 캐시의 태그는 그 캐시가 실제로 읽는 테이블을 기준으로 붙인다.
 */
export const STATIC_REVALIDATE = 604800

/* ────────────────────────────────────────────────────────────────
   조회 실패를 캐시에 박지 않기 위한 두 도우미

   실패했는데 빈 목록을 정상 결과처럼 돌려주면 그 빈 값이 캐시에 저장되고,
   만료(위 7일)까지 화면에서 그 구역이 통째로 사라진다. 에러 화면도 안내도 없이
   자리 자체가 없어지므로 원래 그런 화면인 줄 알게 된다.

   실제로 두 번 났다 — 셀럽 목록(`docs/project/celeb/celeb-gotchas.md` §1),
   인기 작품(26.08.07). 규칙은 `docs/project/tooling-gotchas.md` §3.1.

   쓰는 법 — 캐시되는 fetch 안에서 던지고, 공개 함수에서 받는다.

     async function fetchThing() {
       const { data, error } = await supabase.rpc('...')
       throwOnQueryError('rpc 이름', error)   // 던지면 캐시에 안 남는다
       if (!data.length) return []            // 진짜 빈 결과는 캐시해도 된다
       ...
     }
     const fetchThingCached = unstable_cache(fetchThing, ...)

     export async function getThing() {
       return withQueryFallback('getThing', () => fetchThingCached(...), [])
     }
   ──────────────────────────────────────────────────────────────── */

/** Supabase 조회 오류 모양(`PostgrestError` 등)에서 우리가 실제로 읽는 부분만. */
interface QueryErrorLike {
  message?: string
  code?: string
  details?: string
}

/**
 * PostgREST가 "행이 하나도 없다"를 알릴 때 쓰는 코드.
 *
 * `.single()`은 0행이면 **오류로** 알려준다. 그런데 "그 인물에게는 아직 자료가 없다" 같은
 * 정상 상황도 여기 해당하므로, 그걸 실패로 취급하면 멀쩡한 화면에서 예외가 난다.
 */
export const NO_ROWS_CODE = 'PGRST116'

/**
 * 조회 오류를 던진다. **캐시되는 함수 안에서 부른다** — 던져야 실패가 캐시에 남지 않는다.
 * 오류가 없으면 아무 일도 하지 않는다.
 *
 * `.single()`을 쓰는 조회는 `ignoreCodes: [NO_ROWS_CODE]`를 넘겨 "자료 없음"을 통과시킨다.
 */
export function throwOnQueryError(
  label: string,
  error: QueryErrorLike | null | undefined,
  options?: { ignoreCodes?: readonly string[] },
): void {
  if (!error) return
  if (error.code && options?.ignoreCodes?.includes(error.code)) return
  const detail = [error.message, error.code, error.details].filter(Boolean).join(' / ')
  throw new Error(`${label} 실패: ${detail || '원인 불명'}`)
}

/**
 * 캐시 조회를 감싸 실패해도 화면이 죽지 않게 한다. **공개 함수에서 부른다.**
 *
 * 실패는 위에서 이미 던져졌으므로 캐시에는 남지 않고 다음 요청에서 다시 시도한다.
 * 여기서는 이번 요청만 대체값으로 넘기고 **원인을 반드시 기록한다** — 구역이 사라졌을 때
 * 이유를 찾을 유일한 단서다(조용한 폴백 금지).
 */
export async function withQueryFallback<T>(
  label: string,
  run: () => Promise<T>,
  fallback: T,
): Promise<T> {
  try {
    return await run()
  } catch (e) {
    console.error(`${label} 조회 실패 — 이번 요청만 대체값으로 넘긴다(캐시에는 남기지 않는다):`, e)
    return fallback
  }
}
