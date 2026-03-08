/*
  파일명: /constants/navigation.tsx
  기능: 네비게이션 구조 Single Source of Truth
  책임: PC 헤더, MB 바텀탭, 메인페이지 섹션의 네비게이션 아이템을 단일 원천으로 관리한다.
*/

import { Home, Compass, BookOpen, Gamepad2, User, type LucideIcon } from "lucide-react";

// #region 타입 정의
export interface NavSubLink {
  key?: string;
  href: string;
  label: string;
}

export interface NavItem {
  key: string;
  href: string;
  label: string;
  mobileLabel?: string; // 모바일 바텀탭용 라벨 (없으면 label 사용)
  icon: LucideIcon;
  showInHeader: boolean;
  showInBottomNav: boolean;
  showInHomePage: boolean;
  subLinks?: NavSubLink[];
}

export interface HomeSectionConfig {
  id: string;
  key: string;
  svgSrc: string;
  className?: string;
  link?: string;
}
// #endregion

// #region 네비게이션 아이템 정의
export const NAV_ITEMS: NavItem[] = [
  {
    key: "home",
    href: "/",
    label: "홈",
    icon: Home,
    showInHeader: false,
    showInBottomNav: true,
    showInHomePage: false,
  },
  {
    key: "explore",
    href: "/explore",
    label: "인물",
    icon: Compass,
    showInHeader: true,
    showInBottomNav: true,
    showInHomePage: true,
    subLinks: [
      { key: "celebs", href: "/explore/celebs", label: "셀럽" },
      { key: "topByType", href: "/explore/top-by-type", label: "분야별 기록가" },
      { key: "persona", href: "/explore/persona", label: "비범한 기록가" },
      { key: "spotlight", href: "/explore/spotlight", label: "스포트라이트" },
      { key: "celebFeed", href: "/explore/celeb-feed", label: "셀럽 피드" },
    ],
  },
  {
    key: "scriptures",
    href: "/scriptures",
    label: "서가",
    icon: BookOpen,
    showInHeader: true,
    showInBottomNav: true,
    showInHomePage: true,
    subLinks: [
      { key: "era", href: "/scriptures/era", label: "불후의 명작" },
      { key: "profession", href: "/scriptures/profession", label: "갈림길" },
      { key: "figure", href: "/scriptures/figure", label: "오늘의 인물" },
      { key: "museum", href: "/scriptures/museum", label: "박물관" },
      { key: "academy", href: "/scriptures/academy", label: "학당" },
    ],
  },
  {
    key: "rest",
    href: "/rest",
    label: "쉼터",
    icon: Gamepad2,
    showInHeader: true,
    showInBottomNav: true,
    showInHomePage: false,
    subLinks: [
      { key: "dawn", href: "/rest/dawn", label: "여명" },
      { key: "labyrinth", href: "/rest/labyrinth", label: "미궁" },
      { key: "hegemony", href: "/rest/hegemony", label: "패권" },
      { key: "suikoden", href: "/rest/suikoden", label: "천도" },
    ],
  },
  {
    key: "archive",
    href: "/{userId}",
    label: "내 기록",
    mobileLabel: "내 기록",
    icon: User,
    showInHeader: false,
    showInBottomNav: true,
    showInHomePage: true,
  },
];
// #endregion

// #region 필터된 아이템
export const HEADER_NAV_ITEMS = NAV_ITEMS.filter((item) => item.showInHeader);
export const BOTTOM_NAV_ITEMS = NAV_ITEMS.filter((item) => item.showInBottomNav);
export const HOME_SECTION_KEYS = NAV_ITEMS.filter((item) => item.showInHomePage).map((item) => item.key);
export const FOOTER_NAV_ITEMS = NAV_ITEMS.filter((item) => item.subLinks?.length && item.key !== "rest");
// #endregion

// #region 풋터 브랜드 링크
export const FOOTER_BRAND_LINKS: NavSubLink[] = [
  { key: "about", href: "/about", label: "서비스 소개" },
  { key: "search", href: "/search", label: "검색" },
  { key: "terms", href: "/terms", label: "이용약관" },
  { key: "privacy", href: "/privacy", label: "개인정보처리방침" },
];

export const FOOTER_MISC_LINKS: NavSubLink[] = [
  { key: "game", href: "/rest", label: "게임" },
  { key: "social", href: "/agora/social", label: "소셜" },
  { key: "notice", href: "/agora/board/notice", label: "공지사항" },
  { key: "feedback", href: "/agora/board/feedback", label: "피드백" },
];
// #endregion

// #region 메인페이지 섹션 설정
export const HOME_SECTIONS: Record<string, HomeSectionConfig> = {
  explore: {
    id: "explore-section",
    key: "explore",
    svgSrc: "/images/decorations/owl.svg",
    className: "bg-bg-main border-t border-white/10",
    link: "/explore",
  },
  scriptures: {
    id: "scriptures-section",
    key: "scriptures",
    svgSrc: "/images/decorations/scroll.svg",
    className: "bg-bg-main border-t border-white/10",
    link: "/scriptures",
  },
  rest: {
    id: "rest-section",
    key: "rest",
    svgSrc: "/images/decorations/horn.svg",
    className: "bg-bg-main border-t border-white/10",
    link: "/rest",
  },
  archive: {
    id: "archive-section",
    key: "archive",
    svgSrc: "/images/decorations/vase.svg",
    className: "bg-bg-main border-t border-white/10",
    link: "/{userId}",
  },
};

// 섹션 순서 (스크롤 네비게이션용)
export const SECTION_ORDER = [
  "home-banner",
  "explore-section",
  "scriptures-section",
  "rest-section",
  "archive-section",
] as const;
// #endregion
