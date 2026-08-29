/*
  파일명: /lib/cache.ts
  기능: 캐시 만료 시간 상수 + 조회를 감싸는 두 도우미 + 실패가 캐시에 박히지 않게 하는 두 도우미
  책임: 캐시 만료 주기를 단일 지점에서 관리하고, 상세/목록 조회가 각각 알맞은 태그와
        수명을 자동으로 갖게 하며, 캐시되는 조회가 실패를 "정상 빈 결과"로 굳히지 않도록 강제한다.
*/ // ------------------------------

import { unstable_cache } from 'next/cache'
import { detailCacheTags, type CacheTag } from '@feelandnote/shared/constants/cache-tags'

/**
 * 셀럽 정적 데이터 캐시 만료 (초). 7일.
 *
 * 일반 사용자 활동으로는 변하지 않고, 운영자가 백오피스에서 셀럽/콘텐츠 데이터를
 * 넣거나 고칠 때만 변하는 데이터에 적용한다.
 *
 * 데이터 투입 시 web-bo가 저장한 도메인의 태그(CACHE_TAGS — celebs·contents·dialogues·spectrum·tags)만
 * 골라 즉시 무효화하므로, 이 값은 무효화 누락에 대비한 안전망이다. (= 최악의 경우 7일 내 자동 갱신)
 * 각 캐시의 태그는 그 캐시가 실제로 읽는 테이블을 기준으로 붙인다.
 */
export const STATIC_REVALIDATE = 604800

/**
 * 목록·집계 캐시 만료 (초). 1시간.
 *
 * 목록은 항목 하나가 바뀌어도 구성이 달라지므로 개별 무효화로 잡히지 않는다.
 * (인기순이 바뀌면 목록에 들고 나는 항목 자체가 달라진다.) 그래서 짧은 수명으로
 * 저절로 갱신되게 둔다. 목록 화면은 수십 개뿐이라 자주 다시 만들어도 부담이 없다.
 */
export const LIST_REVALIDATE = 3600

/** 기존 bare-domain 상세 태그를 배포 간 영속 캐시에서 재사용하지 않게 하는 스키마 버전. */
const DETAIL_CACHE_KEY_VERSION = 'detail-tags-v2'

/** 만료 시각을 캐시마다 어긋나게 하는 폭. 정해진 수명의 ±10% 안에서 움직인다. */
const REVALIDATE_SPREAD = 0.1

/**
 * 만료 시각을 키마다 조금씩 어긋나게 한다.
 *
 * 같은 배포에서 함께 만들어진 캐시는 수명이 같으면 한 시각에 같이 식는다. 그 뒤 첫 방문
 * 하나가 조회 여러 건을 동시에 다시 돌리게 되고, 서로 밀려 3초 제한(DB 조회 제한)에
 * 걸려 통째로 실패한다. 화면 한 구역이 사라지는 사고가 여기서 났다.
 *
 * 그래서 키 문자열로 정한 고정 오프셋을 준다. 같은 키는 언제 계산해도 같은 값이 나오므로
 * (무작위가 아니다) 요청마다·빌드마다 흔들리지 않고, 캐시끼리만 만료가 벌어진다.
 */
export function spreadRevalidate(revalidate: number, keyParts: readonly string[]): number {
  const key = keyParts.join('\u0000')
  // FNV-1a — 짧고 결정적이면 충분하다. 보안 용도가 아니다
  let hash = 0x811c9dc5
  for (let index = 0; index < key.length; index++) {
    hash ^= key.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }
  const ratio = (hash >>> 0) / 0x100000000 // 0 이상 1 미만
  const offset = revalidate * REVALIDATE_SPREAD * (ratio * 2 - 1) // ±10%
  return Math.max(1, Math.round(revalidate + offset))
}

/* ────────────────────────────────────────────────────────────────
   조회를 감싸는 두 도우미

   상세는 한 건짜리, 목록은 여러 건을 모은 것이다. 둘은 무효화 방식이 달라야 한다.

   - 상세: 「도메인:식별자」 항목 태그 + 도메인 태그. 한 건을 고치면 그 한 건만 비운다
   - 목록: 도메인 태그만. 대신 수명을 짧게 잡아 저절로 갱신되게 한다

   도메인 태그만 쓰던 때는 인물 한 명을 고쳐도 인물 화면 전부가, 책 한 권을 고쳐도
   책 화면 전부가 낡은 것으로 처리됐다. 그 뒤 방문·크롤링마다 재생성이 쌓여
   ISR 쓰기가 무료 한도의 5.5배까지 올라갔다(26.08.08 실측).

   태그를 손으로 적지 말고 이 도우미를 거쳐라. 적는 자리가 70곳이면 오타와 누락이 난다.
   ──────────────────────────────────────────────────────────────── */

interface CacheOptions {
  /** 만료 시간(초). 기본값은 상세 7일 · 목록 1시간 */
  revalidate?: number
  /** 이 상세 조회가 함께 읽는 다른 도메인. 해당 도메인의 명시적 전량 작업에만 함께 비운다. */
  extraTags?: readonly CacheTag[]
}

/**
 * 한 건짜리 상세 조회를 캐시한다.
 *
 * `keyParts`에는 결과를 가르는 인자를 **빠짐없이** 넣는다. 식별자만 넣고 locale을
 * 빠뜨리면 한국어 결과가 영문 화면에 나간다.
 *
 * ```ts
 * const data = await cachedDetail(CACHE_TAGS.CONTENTS, contentId, ['content-detail', contentId, locale],
 *   () => fetchContentDetail(contentId, locale))
 * ```
 */
export function cachedDetail<R>(
  domain: CacheTag,
  id: string,
  keyParts: readonly string[],
  fn: () => Promise<R>,
  options: CacheOptions = {},
): Promise<R> {
  return unstable_cache(fn, [DETAIL_CACHE_KEY_VERSION, ...keyParts], {
    revalidate: spreadRevalidate(options.revalidate ?? STATIC_REVALIDATE, keyParts),
    // bare domain은 목록 전용이다. 상세에 붙이면 신규 한 건을 목록에 반영할 때
    // 기존 상세 수만 건까지 전부 낡은 것으로 처리된다.
    tags: detailCacheTags(domain, id, options.extraTags),
  })()
}

/**
 * 여러 건을 모은 목록·집계 조회를 캐시한다.
 *
 * ```ts
 * const rows = await cachedList(CACHE_TAGS.CONTENTS, ['popular-books', locale],
 *   () => fetchPopularBooks(locale))
 * ```
 */
export function cachedList<R>(
  domain: CacheTag,
  keyParts: readonly string[],
  fn: () => Promise<R>,
  options: CacheOptions = {},
): Promise<R> {
  return unstable_cache(fn, [...keyParts], {
    revalidate: spreadRevalidate(options.revalidate ?? LIST_REVALIDATE, keyParts),
    tags: [domain, ...(options.extraTags ?? [])],
  })()
}

/* ────────────────────────────────────────────────────────────────
   조회 실패를 캐시에 박지 않기 위한 두 도우미

   실패했는데 빈 목록을 정상 결과처럼 돌려주면 그 빈 값이 캐시에 저장되고,
   만료(위 7일)까지 화면에서 그 구역이 통째로 사라진다. 에러 화면도 안내도 없이
   자리 자체가 없어지므로 원래 그런 화면인 줄 알게 된다.

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

/** PostgREST 조회 오류 모양(`PostgrestError` 등)에서 우리가 실제로 읽는 부분만. */
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
