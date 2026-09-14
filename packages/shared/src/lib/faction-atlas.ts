/**
 * 세력도감 공통 규약 — sw/web·sw/web-bo·스크립트가 함께 쓴다.
 * 순수 값과 함수만 둔다(db 클라이언트에 기대지 않는다).
 */

/** 신화 갈래 최상위 태그. 신화는 신화 화면(/explore/myth)이 따로 다루고 세력도감에서는 뺀다 */
export const MYTH_ROOT_TAG_SLUG = 'myth-and-fiction'

/**
 * 세력 명단 뷰(faction_atlas_members)를 나눠 읽을 때의 정렬 키.
 * 차례(sort_order)가 먼저고, (tag_id, celeb_id)가 한 행을 가르는 고유 키라 페이지 사이 중복·누락이 없다.
 */
export const ATLAS_MEMBER_PAGE_ORDER = ['sort_order', 'tag_id', 'celeb_id'] as const

interface TagNode {
  id: string
  slug: string | null
  parent_id: string | null
}

/**
 * 태그 행 가운데 신화 갈래(최상위와 그 아래 모든 자손)의 id.
 * 공개 여부와 무관하게 전체 행을 넘겨야 부모가 닫혀 있어도 자손이 빠짐없이 걸린다.
 */
export function mythBranchTagIds(rows: readonly TagNode[]): Set<string> {
  const ids = new Set(rows.filter((row) => row.slug === MYTH_ROOT_TAG_SLUG).map((row) => row.id))
  let grew = ids.size > 0
  while (grew) {
    grew = false
    for (const row of rows) {
      if (row.parent_id && ids.has(row.parent_id) && !ids.has(row.id)) {
        ids.add(row.id)
        grew = true
      }
    }
  }
  return ids
}
