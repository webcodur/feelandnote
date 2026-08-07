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
  /** 셀럽 프로필·목록·서고·타임라인·랭킹 등 profiles 기반 */
  CELEBS: 'celebs',
  /** 콘텐츠(도서·영상·음악·게임) 메타·상세·감상문 */
  CONTENTS: 'contents',
  /** 셀럽 고유 대사 */
  DIALOGUES: 'dialogues',
  /** 페르소나 벡터·성향 분포 */
  PERSONA: 'persona',
  /** 세력도감(faction) 태그 편성 */
  TAGS: 'tags',
  /** 픽션 인물 ↔ 대표 원전 콘텐츠 연결 */
  FICTION_SOURCES: 'fiction-sources',
  /** 기관 선정 목록(선정 주체·목록·담긴 작품) */
  CURATED: 'curated',
} as const

export type CacheTag = (typeof CACHE_TAGS)[keyof typeof CACHE_TAGS]

/** /api/revalidate가 허용하는 도메인 태그 목록 */
export const ALL_CACHE_TAGS: CacheTag[] = Object.values(CACHE_TAGS)

/* ────────────────────────────────────────────────────────────────
   항목 태그 — 「도메인:식별자」

   도메인 태그만 쓰면 인물 한 명을 고쳐도 인물 화면 전부가, 책 한 권을 고쳐도
   책 화면 전부가 낡은 것으로 처리된다. 화면 수가 인물 1,929 · 콘텐츠 10,640이라
   (26.08.08 실측) 그 뒤로 방문·크롤링마다 재생성이 쌓여 ISR 쓰기가 무료 한도의
   5.5배까지 올라갔다.

   그래서 상세 조회에는 항목 태그를 함께 단다. 한 건을 고치면 그 한 건만 비운다.
   도메인 태그도 같이 다는 이유는, 대량 작업에서 수백 번 호출하는 대신 도메인
   한 번으로 쓸어내는 길을 남겨 두기 위함이다.
   ──────────────────────────────────────────────────────────────── */

/** 구분자. 식별자(UUID·slug)에 나오지 않는 문자를 쓴다. */
const ITEM_TAG_SEPARATOR = ':'

/** 「도메인:식별자」 태그를 만든다. 식별자가 비면 도메인 태그로 물러난다. */
export function itemTag(domain: CacheTag, id: string | null | undefined): string {
  const trimmed = (id ?? '').trim()
  return trimmed ? `${domain}${ITEM_TAG_SEPARATOR}${trimmed}` : domain
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

  // 식별자는 UUID·slug·외부 id 정도만 — 경로나 공백이 섞이면 거른다
  return /^[A-Za-z0-9._-]{1,128}$/.test(id)
}
