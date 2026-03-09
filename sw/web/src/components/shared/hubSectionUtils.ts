/** 허브 섹션 ID·네비게이션 순수 유틸 (서버/클라이언트 공용) */

export function hubSectionId(index: number, groupId?: string) {
  return groupId ? `hub-${groupId}-${index}` : `hub-section-${index}`;
}

/** SSoT 헬퍼: config 배열의 key로 index/total/groupId를 자동 산출한다 */
export function hubSectionNav(sections: readonly { key: string }[], groupId: string, key: string) {
  const idx = sections.findIndex((s) => s.key === key);
  if (idx === -1) return {};
  return { index: idx, total: sections.length, groupId };
}
