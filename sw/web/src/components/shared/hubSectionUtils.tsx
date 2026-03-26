/** 허브 섹션 ID·네비게이션·config 유틸 */

import {
  Users, Rss, Sparkles, BarChart3, Fingerprint, BookOpenText, Clock,
  Route, Scroll, GraduationCap, CalendarHeart,
} from "lucide-react";

// ────────────────────────────────────────────────────
// 공통 유틸
export function hubSectionId(index: number, groupId?: string) {
  return groupId ? `hub-${groupId}-${index}` : `hub-section-${index}`;
}

interface HubSectionConfig {
  key: string;
  icon: React.ReactNode;
  moreHref: string;
  titleKey: string;
  subtitleKey: string;
  moreKey: string;
}

/** 제네릭 헬퍼: config 배열 + key → HubSection props 일괄 반환 */
function hubSection(sections: readonly HubSectionConfig[], groupId: string, key: string, t: (k: string) => string) {
  const idx = sections.findIndex((s) => s.key === key);
  const sec = sections[idx];
  return {
    title: t(sec.titleKey),
    subtitle: t(sec.subtitleKey),
    moreHref: sec.moreHref,
    moreLabel: t(sec.moreKey),
    index: idx,
    total: sections.length,
    groupId,
  };
}

// ────────────────────────────────────────────────────
// #region Explore 허브 config
export const EXPLORE_GROUP_ID = "explore";

export const EXPLORE_SECTIONS = [
  { key: "deepReaders",     icon: <Users size={14} />,        moreHref: "/explore/figures?sortBy=content_count", titleKey: "deepReaders",     subtitleKey: "deepReadersSub",     moreKey: "viewMore" },
  { key: "topByType",       icon: <BarChart3 size={14} />,    moreHref: "/explore/ranking",                      titleKey: "topByType",       subtitleKey: "topByTypeSub",       moreKey: "viewAll" },
  { key: "personaExtremes", icon: <Fingerprint size={14} />,  moreHref: "/explore/persona",                      titleKey: "personaExtremes", subtitleKey: "personaExtremesSub", moreKey: "viewAll" },
  { key: "spotlight",       icon: <Sparkles size={14} />,     moreHref: "/explore/spotlight",                    titleKey: "spotlight",       subtitleKey: "spotlightSub",       moreKey: "viewAll" },
  { key: "allCelebs",       icon: <Users size={14} />,        moreHref: "/explore/figures?tier=full",            titleKey: "allCelebs",       subtitleKey: "allCelebsSub",       moreKey: "viewAll" },
  { key: "lightCelebs",     icon: <BookOpenText size={14} />, moreHref: "/explore/figures?tier=light",           titleKey: "lightCelebs",     subtitleKey: "lightCelebsSub",     moreKey: "viewAll" },
] as const;

export const EXPLORE_STANDALONE = [
  { key: "navFeed",      href: "/explore/feed",      icon: <Rss size={14} /> },
  { key: "navTimeline",  href: "/explore/timeline",  icon: <Clock size={14} /> },
  { key: "navDirectory", href: "/explore/directory",  icon: <BookOpenText size={14} /> },
] as const;

export const exploreSection = (key: (typeof EXPLORE_SECTIONS)[number]["key"], t: (k: string) => string) =>
  hubSection(EXPLORE_SECTIONS, EXPLORE_GROUP_ID, key, t);
// #endregion

// ────────────────────────────────────────────────────
// #region Scriptures(서가) 허브 config
export const SCRIPTURES_GROUP_ID = "scriptures";

export const SCRIPTURES_SECTIONS = [
  { key: "figure",     icon: <CalendarHeart size={14} />, moreHref: "/explore/today",         titleKey: "figureLabel",     subtitleKey: "figure",     moreKey: "moreDetail" },
  { key: "era",        icon: <Clock size={14} />,         moreHref: "/library/era",        titleKey: "eraLabel",        subtitleKey: "era",        moreKey: "moreDetail" },
  { key: "profession", icon: <Route size={14} />,         moreHref: "/library/profession", titleKey: "professionLabel", subtitleKey: "profession", moreKey: "moreDetail" },
  { key: "museum",     icon: <Scroll size={14} />,        moreHref: "/library/museum",     titleKey: "museumLabel",     subtitleKey: "museum",     moreKey: "exploreMuseum" },
  { key: "academy",    icon: <GraduationCap size={14} />, moreHref: "/library/academy",    titleKey: "academyLabel",    subtitleKey: "academy",    moreKey: "enterAcademy" },
] as const;

export const scripturesSection = (key: (typeof SCRIPTURES_SECTIONS)[number]["key"], t: (k: string) => string) =>
  hubSection(SCRIPTURES_SECTIONS, SCRIPTURES_GROUP_ID, key, t);
// #endregion
