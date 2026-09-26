/** 허브 섹션 ID·네비게이션·config 유틸
 *
 *  구획은 언제나 그려진다 — 조회에 실패해도, 자료가 0건이어도 자리를 지킨다.
 *  그래서 목차·번호·총 개수는 조회 결과가 아니라 config에서 고정으로 뽑는다.
 *  (예전에는 "실제로 그려지는 구획만 센다"는 규칙이 있었지만, 그 규칙이 실패한 구획을
 *   조용히 지워 버려 26.08.15에 폐기했다.)
 */


// ────────────────────────────────────────────────────
// 공통 유틸
export function hubSectionId(index: number, groupId?: string) {
  return groupId ? `hub-${groupId}-${index}` : `hub-section-${index}`;
}

interface HubSectionConfig {
  key: string;
  moreHref: string;
  titleKey: string;
  subtitleKey: string;
  moreKey: string;
}

/** 제네릭 헬퍼: config 배열 + key → HubSection props 일괄 반환.
 *  호출자는 config 전체를 그대로 넘긴다 — 번호·총 개수·첫 구획 판정이 조회 결과에 흔들리지 않는다. */
export function hubSection(sections: readonly HubSectionConfig[], groupId: string, key: string, t: (k: string) => string) {
  const idx = sections.findIndex((s) => s.key === key);
  if (idx < 0) throw new Error(`hubSection: config에 없는 구획을 참조했다 (${groupId}/${key})`);
  const sec = sections[idx];
  return {
    title: t(sec.titleKey),
    subtitle: t(sec.subtitleKey),
    moreHref: sec.moreHref,
    moreLabel: t(sec.moreKey),
    index: idx,
    total: sections.length,
    groupId,
    // 첫 구획 위로는 구분선을 두지 않는다 (바로 위가 목차 줄이다)
    hideDivider: idx === 0,
  };
}

/** 더보기를 구획 내부에서 따로 처리하는 구획용 — 래퍼가 붙이는 더보기를 뗀다 */
export function withoutMore(p: ReturnType<typeof hubSection>) {
  return { title: p.title, subtitle: p.subtitle, index: p.index, total: p.total, groupId: p.groupId, hideDivider: p.hideDivider };
}

/** 목차 줄 항목 — 라벨은 구획 제목과 같은 문구를 쓴다. config 전체를 넘긴다(구획은 항상 그려진다) */
export function hubNavItems(sections: readonly HubSectionConfig[], t: (k: string) => string) {
  return sections.map((s) => ({ label: t(s.titleKey), href: s.moreHref }));
}

// ────────────────────────────────────────────────────
// #region Home 허브 config — 홈도 탐색·서가와 같은 위계 문법(목차 + 번호 구획)을 쓴다
export const HOME_GROUP_ID = "home";

export const HOME_SECTIONS = [
  { key: "todayFigure", moreHref: "/explore/today",     titleKey: "todayFigure", subtitleKey: "todayFigureSub", moreKey: "viewAll" },
  { key: "figureLinks", moreHref: "/explore?sortBy=country_trending", titleKey: "figureLinks", subtitleKey: "figureLinksSub", moreKey: "viewAll" },
  { key: "notice",      moreHref: "/agora/board/notice", titleKey: "notice",     subtitleKey: "noticeSub",      moreKey: "viewAll" },
] as const;
// #endregion
