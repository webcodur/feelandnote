/**
 * 도감 인물 배정 공통 규약 — sw/web·sw/web-bo·스크립트가 함께 쓴다.
 * 순수 값과 함수만 둔다(db 클라이언트에 기대지 않는다).
 *
 * 위계는 faction_lv1(테마) → faction_lv2(세력·신화, is_myth로 가른다) → faction_lv3(그룹),
 * 인물 연결은 faction_members. 읽기는 뷰 faction_member_rows가 그룹 이름까지 붙여 내놓는다.
 */

/**
 * 배정 뷰(faction_member_rows)를 나눠 읽을 때의 정렬 키.
 * 차례(sort_order)가 먼저고, (lv2_id, celeb_id)가 한 행을 가르는 고유 키라 페이지 사이 중복·누락이 없다.
 */
export const MEMBER_PAGE_ORDER = ['sort_order', 'lv2_id', 'celeb_id'] as const
