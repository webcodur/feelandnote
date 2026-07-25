/*
  파일명: components/features/landing/factionGrouping.ts
  기능: 세력도감 태그 그룹핑 헬퍼
  책임: 평면 태그 배열을 최상위(그룹 헤더 + 무소속)와 그룹별 자식으로 나눈다.
        각 태그의 원래 index를 유지해 FeaturedFaction의 인덱스 선택 모델과 호환한다.
*/ // ------------------------------

import type { FeaturedTag } from "@/actions/home"

export interface IndexedTag {
  tag: FeaturedTag
  /** tags 배열 내 원래 index (onSelect/onChange에 그대로 전달) */
  idx: number
}

/** 최상위에 노출할 태그(그룹 헤더 + 그룹에 속하지 않은 태그). 자식은 제외. */
export function topLevelTags(tags: FeaturedTag[]): IndexedTag[] {
  return tags.map((tag, idx) => ({ tag, idx })).filter(({ tag }) => !tag.parentSlug)
}

/**
 * 특정 그룹의 자식 태그들.
 *
 * 표시 순서는 넘어온 배열 순서를 그대로 쓴다 — `getFeaturedTags`가 이미 DB 노출 순서
 * (`celeb_tags.sort_order`)대로 실어 오므로 여기서 다시 정렬할 근거가 없다.
 */
export function childTags(tags: FeaturedTag[], groupSlug: string): IndexedTag[] {
  return tags
    .map((tag, idx) => ({ tag, idx }))
    .filter(({ tag }) => tag.parentSlug === groupSlug)
}

/** 그룹 카드 미리보기 아바타: 자식 태그별 대표 인물을 모은다. */
export function groupPreviewCelebs(
  tags: FeaturedTag[],
  groupSlug: string,
  limit = 7
): FeaturedTag["celebs"] {
  const out: FeaturedTag["celebs"] = []
  for (const { tag } of childTags(tags, groupSlug)) {
    const c = tag.celebs?.[0]
    if (c) out.push(c)
    if (out.length >= limit) break
  }
  return out
}

/** 그룹에 속한 전체 인물 수. */
export function groupCelebCount(tags: FeaturedTag[], groupSlug: string): number {
  return childTags(tags, groupSlug).reduce((sum, { tag }) => sum + (tag.celebs?.length ?? 0), 0)
}
