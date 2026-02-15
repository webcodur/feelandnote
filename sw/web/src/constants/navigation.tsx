/*
  파일명: /constants/navigation.tsx
  기능: 네비게이션 구조 Single Source of Truth
  책임: PC 헤더, MB 바텀탭, 메인페이지 섹션의 네비게이션 아이템을 단일 원천으로 관리한다.
*/

import { Compass, BookOpen, Armchair, Gamepad2, User, type LucideIcon } from "lucide-react";

// #region 타입 정의
export interface NavSubLink {
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

export interface PageBannerConfig {
  title: string;
  englishTitle: string;
}

export interface HomeSectionConfig {
  id: string;
  title: string;
  englishTitle: string;
  description: React.ReactNode;
  svgSrc: string;
  className?: string;
  link?: string;
  linkText?: string;
}
// #endregion

// #region 네비게이션 아이템 정의
export const NAV_ITEMS: NavItem[] = [
  {
    key: "explore",
    href: "/explore",
    label: "인물",
    icon: Compass,
    showInHeader: true,
    showInBottomNav: true,
    showInHomePage: true,
    subLinks: [
      { href: "/explore/celebs", label: "셀럽" },
      { href: "/explore/people", label: "소셜" },
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
      { href: "/scriptures/era", label: "불후의 명작" },
      { href: "/scriptures/profession", label: "갈림길" },
    ],
  },
  {
    key: "agora",
    href: "/agora",
    label: "광장",
    icon: Armchair,
    showInHeader: true,
    showInBottomNav: true,
    showInHomePage: true,
    subLinks: [
      { href: "/agora/celeb-feed", label: "셀럽 피드" },
      { href: "/agora/friend-feed", label: "친구 피드" },
      { href: "/agora/board/notice", label: "공지사항" },
      { href: "/agora/board/feedback", label: "피드백" },
    ],
  },
  {
    key: "rest",
    href: "/rest",
    label: "쉼터",
    icon: Gamepad2,
    showInHeader: false,
    showInBottomNav: false,
    showInHomePage: false,
    subLinks: [
      { href: "/rest/dawn", label: "여명" },
      { href: "/rest/labyrinth", label: "미궁" },
      { href: "/rest/hegemony", label: "패권" },
    ],
  },
  {
    key: "archive",
    href: "/{userId}",
    label: "내 기록관",
    mobileLabel: "내 기록관",
    icon: User,
    showInHeader: true,
    showInBottomNav: true,
    showInHomePage: true,
  },
];
// #endregion

// #region 필터된 아이템
export const HEADER_NAV_ITEMS = NAV_ITEMS.filter((item) => item.showInHeader);
export const BOTTOM_NAV_ITEMS = NAV_ITEMS.filter((item) => item.showInBottomNav);
export const HOME_SECTION_KEYS = NAV_ITEMS.filter((item) => item.showInHomePage).map((item) => item.key);
export const FOOTER_NAV_ITEMS = NAV_ITEMS.filter((item) => item.subLinks?.length);
// #endregion

// #region 풋터 브랜드 링크
export const FOOTER_BRAND_LINKS: NavSubLink[] = [
  { href: "/about", label: "서비스 소개" },
  { href: "/search", label: "검색" },
  { href: "/terms", label: "이용약관" },
  { href: "/privacy", label: "개인정보처리방침" },
];
// #endregion

// #region 헬퍼 함수
const getNavLabel = (key: string) => NAV_ITEMS.find((item) => item.key === key)?.label ?? "";
// #endregion

// #region 메인페이지 섹션 설정
export const HOME_SECTIONS: Record<string, HomeSectionConfig> = {
  explore: {
    id: "explore-section",
    title: getNavLabel("explore"),
    englishTitle: "Explore",
    description: "다양한 인물과 그들이 즐긴 콘텐츠를 만나보세요.",
    svgSrc: "/images/decorations/owl.svg",
    className: "bg-bg-main border-t border-white/10",
    link: "/explore",
    linkText: `${getNavLabel("explore")} 보러가기`,
  },
  scriptures: {
    id: "scriptures-section",
    title: getNavLabel("scriptures"),
    englishTitle: "Library",
    description: "오늘의 인물, 공통 서가, 직업별 추천을 확인하세요.",
    svgSrc: "/images/decorations/scroll.svg",
    className: "bg-bg-main border-t border-white/10",
    link: "/scriptures",
    linkText: `${getNavLabel("scriptures")} 보러가기`,
  },
  agora: {
    id: "agora-section",
    title: getNavLabel("agora"),
    englishTitle: "Community",
    description: "다른 사용자들과 소통하고 피드를 확인하세요.",
    svgSrc: "/images/decorations/lyre.svg",
    className: "bg-bg-main border-t border-white/10",
    link: "/agora",
    linkText: `${getNavLabel("agora")} 보러가기`,
  },
  rest: {
    id: "rest-section",
    title: "쉼터",
    englishTitle: "Take a Rest",
    description: "잠시 쉬어가며 가볍게 즐기는 미니게임.",
    svgSrc: "/images/decorations/horn.svg",
    className: "bg-bg-main border-t border-white/10",
    link: "/rest",
    linkText: `${getNavLabel("rest")} 가기`,
  },
  archive: {
    id: "archive-section",
    title: getNavLabel("archive"),
    englishTitle: "My Archives",
    description: "내가 본 콘텐츠를 기록하고 관리하세요.",
    svgSrc: "/images/decorations/vase.svg",
    className: "bg-bg-main border-t border-white/10",
    link: "/{userId}",
    linkText: `${getNavLabel("archive")} 보러가기`,
  },
};

// 섹션 순서 (스크롤 네비게이션용)
export const SECTION_ORDER = [
  "home-banner",
  "explore-section",
  "scriptures-section",
  "agora-section",
  "rest-section",
  "archive-section",
] as const;
// #endregion

// #region 페이지 배너 설정 (각 페이지 레이아웃에서 사용)
export const PAGE_BANNER = {
  explore: {
    title: HOME_SECTIONS.explore.title,
    englishTitle: HOME_SECTIONS.explore.englishTitle,
  },
  scriptures: {
    title: HOME_SECTIONS.scriptures.title,
    englishTitle: HOME_SECTIONS.scriptures.englishTitle,
  },
  agora: {
    title: HOME_SECTIONS.agora.title,
    englishTitle: HOME_SECTIONS.agora.englishTitle,
  },
  rest: {
    title: HOME_SECTIONS.rest.title,
    englishTitle: HOME_SECTIONS.rest.englishTitle,
  },
  archive: {
    titleSuffix: "의 기록관",
    englishTitle: "Official Sacred Record",
  },
} as const;
// #endregion
