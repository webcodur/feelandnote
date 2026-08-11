/** 허브 섹션 ID·네비게이션·config 유틸 */

import { Rss, Clock, Youtube, BookOpenText, UsersRound } from "lucide-react";

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
 *  넘어온 배열이 곧 "실제로 그려지는 구획 목록"이다 — 번호·총 개수·첫 구획 판정 모두 여기서 나온다. */
export function hubSection(sections: readonly HubSectionConfig[], groupId: string, key: string, t: (k: string) => string) {
  const idx = sections.findIndex((s) => s.key === key);
  if (idx < 0) throw new Error(`hubSection: 그려지지 않는 구획을 참조했다 (${groupId}/${key})`);
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

/** 목차 줄 항목 — 라벨은 구획 제목과 같은 문구를 쓴다 */
export function hubNavItems(sections: readonly HubSectionConfig[], t: (k: string) => string) {
  return sections.map((s) => ({ label: t(s.titleKey), href: s.moreHref }));
}

// ────────────────────────────────────────────────────
// #region Explore 허브 config
export const EXPLORE_GROUP_ID = "explore";

export const EXPLORE_SECTIONS = [
  { key: "ranking",         moreHref: "/explore/ranking",           titleKey: "ranking",         subtitleKey: "rankingSub",         moreKey: "viewAll" },
  { key: "spectrumAnalysis", moreHref: "/explore/spectrum",           titleKey: "spectrumAnalysis", subtitleKey: "spectrumAnalysisSub", moreKey: "viewAll" },
  { key: "faction",         moreHref: "/explore/faction",           titleKey: "faction",         subtitleKey: "factionSub",         moreKey: "viewAll" },
] as const;

export type ExploreSectionKey = (typeof EXPLORE_SECTIONS)[number]["key"];

/** 이 줄이 유일한 입구인 별도 화면들 */
export const EXPLORE_STANDALONE = [
  { key: "navFeed",      href: "/explore/feed",               icon: <Rss size={14} /> },
  { key: "navTimeline",  href: "/explore/timeline",           icon: <Clock size={14} /> },
  { key: "navYoutube",   href: "/explore/youtube",            icon: <Youtube size={14} /> },
  { key: "navDirectory", href: "/explore/directory",          icon: <BookOpenText size={14} /> },
  { key: "navOthers",    href: "/explore/figures?tier=light", icon: <UsersRound size={14} /> },
] as const;
// #endregion

// ────────────────────────────────────────────────────
// #region Library(서가) 허브 config
export const LIBRARY_GROUP_ID = "library";

/**
 * 서가는 매체의 이야기를 시간 순으로 쌓는다 — 남은 작품(인기·기관 선정) → 걸어온 길(박물관) → 다루는 법과 다음(학당).
 * 오늘의 인물은 26.08.07에 뺐다. 인물은 탐색·홈이 이미 맡고 있고, 더보기가 탐색으로 나가 사용자를 밖으로 내보냈다.
 */
export const LIBRARY_SECTIONS = [
  { key: "popular",    moreHref: "/library/popular",    titleKey: "popularLabel",    subtitleKey: "popular",    moreKey: "moreDetail" },
  { key: "curated",    moreHref: "/library/curated",    titleKey: "curatedLabel",    subtitleKey: "curated",    moreKey: "exploreCurated" },
  { key: "museum",     moreHref: "/library/museum",     titleKey: "museumLabel",     subtitleKey: "museum",     moreKey: "exploreMuseum" },
  { key: "academy",    moreHref: "/library/academy",    titleKey: "academyLabel",    subtitleKey: "academy",    moreKey: "enterAcademy" },
] as const;

export const librarySection = (key: (typeof LIBRARY_SECTIONS)[number]["key"], t: (k: string) => string) =>
  hubSection(LIBRARY_SECTIONS, LIBRARY_GROUP_ID, key, t);
// #endregion
