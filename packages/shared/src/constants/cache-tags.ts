/*
  파일명: /constants/cache-tags.ts
  기능: web 캐시 무효화 태그 단일원천(SSoT)
  책임: web의 unstable_cache 태그와 web-bo의 무효화 호출이 같은 문자열을 쓰도록 보장한다.
*/ // ------------------------------

/**
 * 캐시 태그 도메인.
 *
 * 이전에는 web 캐시 약 70곳이 전부 'celebs' 단일 태그를 공유해, BO에서 무엇을 저장하든
 * 게시판·게임·검색·업적 캐시까지 전부 함께 날아갔다. 퍼지 1회당 콜드 재조회가 약 46MB라
 * egress 초과의 활성 경로였다(2026-07-15 실측). 저장한 도메인만 비우도록 분리한다.
 *
 * 새 태그를 추가하면 web의 /api/revalidate ALLOWED_TAGS에도 반영해야 한다
 * (이 상수를 그대로 import하므로 자동 반영된다).
 */
export const CACHE_TAGS = {
  /** 셀럽 프로필·목록·서고·타임라인·랭킹 등 celebs 기반 */
  CELEBS: 'celebs',
  /** 콘텐츠(도서·영상·음악·게임) 메타·상세·감상문 */
  CONTENTS: 'contents',
  /** 셀럽 고유 대사 */
  DIALOGUES: 'dialogues',
  /** 스펙트럼 벡터·성향 분포 */
  SPECTRUM: 'spectrum',
  /** 세력도감(faction) 태그 편성 */
  TAGS: 'tags',
  /** 픽션 인물 ↔ 대표 원전 콘텐츠 연결 */
  FICTION_SOURCES: 'fiction-sources',
  /** 기관 선정 목록(선정 주체·목록·담긴 작품) */
  CURATED: 'curated',
} as const

export type CacheTag = (typeof CACHE_TAGS)[keyof typeof CACHE_TAGS]

/** Cloudflare 퍼지 결과와 /api/revalidate 성공 응답의 공유 계약. */
export type CloudflarePurgeResult =
  | {
      urls: string[]
      ok: true
      status: 'not_needed'
      mode: 'none'
    }
  | {
      urls: string[]
      ok: true
      status: 'purged'
      mode: 'targeted' | 'everything'
    }
  | {
      urls: string[]
      ok: false
      status: 'not_configured' | 'failed'
      mode: 'targeted' | 'everything'
      failedBatches?: number
    }

export interface CompleteCacheRevalidationResponse {
  revalidated: true
  complete: true
  tags: string[]
  cloudflare: Extract<CloudflarePurgeResult, { ok: true }>
}

function sameUniqueStrings(actual: unknown, expected: readonly string[]): actual is string[] {
  if (!Array.isArray(actual) || actual.some((value) => typeof value !== 'string')) return false
  if (actual.length !== expected.length || new Set(actual).size !== actual.length) return false
  const expectedSet = new Set(expected)
  return expectedSet.size === expected.length && actual.every((value) => expectedSet.has(value))
}

/** web·web-bo·운영 CLI가 동일한 완료 응답만 성공으로 보게 한다. */
export function isCompleteCacheRevalidationResponse(
  value: unknown,
  expectedTags: readonly string[],
  expectedMode?: 'none' | 'targeted' | 'everything',
): value is CompleteCacheRevalidationResponse {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const response = value as Record<string, unknown>
  if (response.revalidated !== true || response.complete !== true) return false
  if (!sameUniqueStrings(response.tags, expectedTags)) return false

  const cloudflare = response.cloudflare
  if (!cloudflare || typeof cloudflare !== 'object' || Array.isArray(cloudflare)) return false
  const result = cloudflare as Record<string, unknown>
  if (result.ok !== true || !Array.isArray(result.urls)) return false
  if (result.urls.some((url) => typeof url !== 'string')) return false
  if (expectedMode !== undefined && result.mode !== expectedMode) return false

  return (
    result.status === 'purged'
      && result.mode === 'targeted'
      && result.urls.length > 0
  ) || (
    result.status === 'purged'
      && result.mode === 'everything'
      && result.urls.length === 0
  ) || (
    result.status === 'not_needed'
      && result.mode === 'none'
      && result.urls.length === 0
  )
}

/** 상세 캐시 전량을 명시적으로 가리키는 예약 식별자. 도메인 태그는 목록 전용이다. */
export const BULK_CACHE_ID = '__all__'

/** /api/revalidate가 허용하는 도메인 태그 목록 */
export const ALL_CACHE_TAGS: CacheTag[] = Object.values(CACHE_TAGS)

/**
 * 배포 전환기 외부 호출의 폐기 전 태그를 정식 태그로 바꾼다.
 * 새 코드가 legacy 명칭을 생성하지 않도록 revalidate API 입력 경계에서만 호출한다.
 */
export function normalizeLegacyCacheTag(tag: unknown): unknown {
  if (typeof tag !== 'string') return tag
  if (tag === 'persona') return CACHE_TAGS.SPECTRUM
  if (tag.startsWith('persona:')) return `${CACHE_TAGS.SPECTRUM}:${tag.slice('persona:'.length)}`
  return tag
}

/* ────────────────────────────────────────────────────────────────
   항목 태그 — 「도메인:식별자」

   도메인 태그만 쓰면 인물 한 명을 고쳐도 인물 화면 전부가, 책 한 권을 고쳐도
   책 화면 전부가 낡은 것으로 처리된다. 화면 수가 인물 1,929 · 콘텐츠 10,640이라
   (26.08.08 실측) 그 뒤로 방문·크롤링마다 재생성이 쌓여 ISR 쓰기가 무료 한도의
   5.5배까지 올라갔다.

   그래서 상세 조회에는 항목 태그와 별도 `도메인:__all__` 태그를 단다. 한 건을 고치면
   그 한 건만, 명시적 대량 작업이면 `__all__`만 비운다. bare 도메인 태그는 목록 전용이다.
   목록 구성이 바뀌었다고 기존 상세 수만 건까지 함께 재생성되는 일을 막기 위한 분리다.
   ──────────────────────────────────────────────────────────────── */

/** 구분자. 식별자(UUID·slug)에 나오지 않는 문자를 쓴다. */
const ITEM_TAG_SEPARATOR = ':'

/** 「도메인:식별자」 태그를 만든다. 식별자가 비면 도메인 태그로 물러난다. */
export function itemTag(domain: CacheTag, id: string | null | undefined): string {
  const trimmed = (id ?? '').trim()
  return trimmed ? `${domain}${ITEM_TAG_SEPARATOR}${trimmed}` : domain
}

/** 한 도메인의 상세 캐시 전량에만 붙는 태그. 목록 태그와 분리해 신규 등록이 상세 전량을 비우지 않게 한다. */
export function bulkTag(domain: CacheTag): string {
  return itemTag(domain, BULK_CACHE_ID)
}

/**
 * 상세 조회 하나가 실제로 의존하는 항목·전량 태그를 만든다.
 * 관련 도메인이 같은 식별자를 공유하면 그 도메인의 단일 항목 수정에도 함께 갱신된다.
 */
export function detailCacheTags(
  domain: CacheTag,
  id: string | null | undefined,
  relatedDomains: readonly CacheTag[] = [],
): string[] {
  const trimmed = (id ?? '').trim()
  if (!trimmed) throw new Error(`Cache item identifier is required for ${domain}`)

  const domains = [...new Set([domain, ...relatedDomains])]
  return [
    ...domains.map((value) => itemTag(value, trimmed)),
    ...domains.map(bulkTag),
  ]
}

/** 정말 전량이 바뀐 작업에서 목록 태그와 상세 전량 태그를 함께 만든다. */
export function domainRevalidationTags(domains: CacheTag | readonly CacheTag[]): string[] {
  const values = Array.isArray(domains) ? domains : [domains]
  return [...new Set(values.flatMap((domain) => [domain, bulkTag(domain)]))]
}

export interface CacheItemTarget {
  domain: CacheTag
  id: string | null | undefined
}

/**
 * 특정 항목과, 구성 변경이 필요한 목록만 가리킨다.
 *
 * 식별자가 비었다고 도메인 전량 퍼지로 물러나면 호출부 실수 하나가 수만 상세를 비우므로
 * 실패시켜 원래 저장 작업에서 바로 드러낸다.
 */
export function itemRevalidationTags(
  targets: readonly CacheItemTarget[],
  listDomains: readonly CacheTag[] = [],
): string[] {
  const itemTags = targets.map(({ domain, id }) => {
    const trimmed = (id ?? '').trim()
    if (!trimmed) throw new Error(`Cache item identifier is required for ${domain}`)
    return itemTag(domain, trimmed)
  })

  return [...new Set([...itemTags, ...listDomains])]
}

/**
 * /api/revalidate가 받아도 되는 태그인지 본다.
 *
 * 도메인 태그이거나 「알려진 도메인:식별자」여야 한다. 아무 문자열이나 받으면
 * 외부에서 임의 캐시를 비울 수 있으므로 형태를 좁게 잡는다.
 */
export function isAllowedCacheTag(tag: unknown): tag is string {
  if (typeof tag !== 'string' || tag.length === 0 || tag.length > 200) return false
  if ((ALL_CACHE_TAGS as string[]).includes(tag)) return true

  const at = tag.indexOf(ITEM_TAG_SEPARATOR)
  if (at <= 0) return false

  const domain = tag.slice(0, at)
  const id = tag.slice(at + 1)
  if (!(ALL_CACHE_TAGS as string[]).includes(domain)) return false

  // 공개 경로 조각에 쓰이는 식별자다. `uğur-şahin`, `NYPL:...` 같은 실제 값은
  // 허용하되 경로·쿼리를 바꾸거나 제어문자를 숨길 수 있는 문자는 거른다.
  if (id === '.' || id === '..') return false
  return /^[^\s/\\?#%\p{Cc}\p{Cf}\p{Cs}]{1,128}$/u.test(id)
}
