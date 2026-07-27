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
  { key: "personaAnalysis", moreHref: "/explore/persona",           titleKey: "personaAnalysis", subtitleKey: "personaAnalysisSub", moreKey: "viewAll" },
  { key: "faction",         moreHref: "/explore/faction",           titleKey: "faction",         subtitleKey: "factionSub",         moreKey: "viewAll" },
  { key: "allCelebs",       moreHref: "/explore/figures?tier=full", titleKey: "allCelebs",       subtitleKey: "allCelebsSub",       moreKey: "viewAll" },
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
// #region Scriptures(서가) 허브 config
export const SCRIPTURES_GROUP_ID = "scriptures";

export const SCRIPTURES_SECTIONS = [
  { key: "figure",     moreHref: "/explore/today",      titleKey: "figureLabel",     subtitleKey: "figure",     moreKey: "moreDetail" },
  { key: "era",        moreHref: "/library/era",        titleKey: "eraLabel",        subtitleKey: "era",        moreKey: "moreDetail" },
  { key: "profession", moreHref: "/library/profession", titleKey: "professionLabel", subtitleKey: "profession", moreKey: "moreDetail" },
  { key: "museum",     moreHref: "/library/museum",     titleKey: "museumLabel",     subtitleKey: "museum",     moreKey: "exploreMuseum" },
  { key: "academy",    moreHref: "/library/academy",    titleKey: "academyLabel",    subtitleKey: "academy",    moreKey: "enterAcademy" },
] as const;

export const scripturesSection = (key: (typeof SCRIPTURES_SECTIONS)[number]["key"], t: (k: string) => string) =>
  hubSection(SCRIPTURES_SECTIONS, SCRIPTURES_GROUP_ID, key, t);
// #endregion
