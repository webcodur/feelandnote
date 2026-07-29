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
} as const

export type CacheTag = (typeof CACHE_TAGS)[keyof typeof CACHE_TAGS]

/** /api/revalidate가 허용하는 태그 목록 */
export const ALL_CACHE_TAGS: CacheTag[] = Object.values(CACHE_TAGS)
