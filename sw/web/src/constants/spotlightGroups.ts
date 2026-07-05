/*
  파일명: constants/spotlightGroups.ts
  기능: 스포트라이트 태그 상위 그룹 정의
  책임: 어떤 태그가 어느 상위 그룹에 속하는지 코드로 관리한다.

  배경: celeb_tags에 계층(parent_id) 컬럼을 두는 것이 정석이나, 스키마 변경 권한
        제약으로 그룹 소속을 코드 상수로 관리한다. 그룹 헤더 자체는 DB celeb_tags에
        일반 태그 1행(slug='ai')으로 존재한다. 인증 복구 시 parent_id 컬럼으로 이관 예정.
*/ // ------------------------------

export interface SpotlightGroupDef {
  /** 그룹 헤더 태그의 slug (DB celeb_tags에 실제 존재) */
  slug: string
  /** 그룹에 속한 자식 태그 slug (표시 순서대로) */
  childSlugs: string[]
}

export const SPOTLIGHT_GROUPS: SpotlightGroupDef[] = [
  {
    slug: "ai",
    childSlugs: [
      "ai-pioneers",
      "openai",
      "anthropic",
      "google-deepmind",
      "xai",
      "meta",
      "mistral",
      "hugging-face",
      "deepseek",
      "thinking-machines",
      "ssi",
    ],
  },
  {
    slug: "rulers-and-empires",
    childSlugs: ["conquerors", "roman-emperors", "sengoku-warlords", "readers-on-the-throne"],
  },
  {
    slug: "heroes-of-turbulent-times",
    childSlugs: ["the-chu-han-contention", "three-kingdoms"],
  },
  {
    slug: "the-thinkers",
    childSlugs: ["hundred-schools-of-thought", "existentialists"],
  },
  {
    slug: "revolutions-and-founding",
    childSlugs: ["the-founding-fathers", "the-french-revolution", "digital-resistance"],
  },
  {
    slug: "art-movements",
    childSlugs: ["renaissance-maestros", "fin-de-si-cle-vienna", "the-lost-generation", "british-invasion"],
  },
  {
    slug: "self-made-innovators",
    childSlugs: ["self-made", "autodidact", "paypal-mafia"],
  },
  {
    slug: "against-adversity",
    childSlugs: ["deprivation", "exiles"],
  },
]

/** 자식 slug → 그룹 slug */
export const SPOTLIGHT_CHILD_TO_GROUP: Record<string, string> = Object.fromEntries(
  SPOTLIGHT_GROUPS.flatMap((g) => g.childSlugs.map((c) => [c, g.slug]))
)

/** 그룹 헤더 slug 집합 */
export const SPOTLIGHT_GROUP_SLUGS = new Set(SPOTLIGHT_GROUPS.map((g) => g.slug))

/** 그룹 slug → 자식 slug 표시 순서 (자식 정렬용) */
export const SPOTLIGHT_GROUP_CHILD_ORDER: Record<string, string[]> = Object.fromEntries(
  SPOTLIGHT_GROUPS.map((g) => [g.slug, g.childSlugs])
)
