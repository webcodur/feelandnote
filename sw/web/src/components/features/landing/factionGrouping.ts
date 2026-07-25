/*
  파일명: components/features/landing/factionGrouping.ts
  기능: 세력도감 태그 그룹핑 헬퍼
  책임: 평면 태그 배열을 최상위(그룹 헤더 + 무소속)와 그룹별 자식으로 나눈다.
        각 태그의 원래 index를 유지해 FeaturedFaction의 인덱스 선택 모델과 호환한다.
*/ // ------------------------------

import type { FeaturedTag } from "@/actions/home"
import { FACTION_GROUP_CHILD_ORDER } from "@/constants/factionGroups"

export interface IndexedTag {
  tag: FeaturedTag
  /** tags 배열 내 원래 index (onSelect/onChange에 그대로 전달) */
  idx: number
}

/** 최상위에 노출할 태그(그룹 헤더 + 그룹에 속하지 않은 태그). 자식은 제외. */
export function topLevelTags(tags: FeaturedTag[]): IndexedTag[] {
  return tags.map((tag, idx) => ({ tag, idx })).filter(({ tag }) => !tag.parentSlug)
}

/** 특정 그룹의 자식 태그들 (상수에 정의된 표시 순서대로). */
export function childTags(tags: FeaturedTag[], groupSlug: string): IndexedTag[] {
  const order = FACTION_GROUP_CHILD_ORDER[groupSlug] ?? []
  return tags
    .map((tag, idx) => ({ tag, idx }))
    .filter(({ tag }) => tag.parentSlug === groupSlug)
    .sort((a, b) => {
      const ia = order.indexOf(a.tag.slug ?? "")
      const ib = order.indexOf(b.tag.slug ?? "")
      return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib)
    })
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
