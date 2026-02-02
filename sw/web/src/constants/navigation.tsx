/*
  파일명: /constants/navigation.tsx
  기능: 네비게이션 구조 Single Source of Truth
  책임: PC 헤더, MB 바텀탭, 메인페이지 섹션의 네비게이션 아이템을 단일 원천으로 관리한다.
*/

import { Compass, BookOpen, Armchair, Gamepad2, User, type LucideIcon } from "lucide-react";

// #region 타입 정의
export interface NavItem {
  key: string;
  href: string;
  label: string;
  mobileLabel?: string; // 모바일 바텀탭용 라벨 (없으면 label 사용)
  icon: LucideIcon;
  showInHeader: boolean;
  showInBottomNav: boolean;
  showInHomePage: boolean;
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
    label: "탐색",
    icon: Compass,
    showInHeader: true,
    showInBottomNav: true,
    showInHomePage: true,
  },
  {
    key: "scriptures",
    href: "/scriptures",
    label: "서고",
    icon: BookOpen,
    showInHeader: true,
    showInBottomNav: true,
    showInHomePage: true,
  },
  {
    key: "agora",
    href: "/agora",
    label: "광장",
    icon: Armchair,
    showInHeader: true,
    showInBottomNav: true,
    showInHomePage: true,
  },
  {
    key: "arena",
    href: "/arena",
    label: "전장",
    icon: Gamepad2,
    showInHeader: true,
    showInBottomNav: true,
    showInHomePage: true,
  },
  {
    key: "archive",
    href: "/{userId}",
    label: "기록관",
    mobileLabel: "내 페이지",
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
// #endregion

// #region 헬퍼 함수
const getNavLabel = (key: string) => NAV_ITEMS.find((item) => item.key === key)?.label ?? "";
// #endregion

// #region 메인페이지 섹션 설정
export const HOME_SECTIONS: Record<string, HomeSectionConfig> = {
  explore: {
    id: "explore-section",
    title: `영감의 ${getNavLabel("explore")}`,
    englishTitle: "Explore",
    description: (
      <>
        시대를 초월한 지성을 만나는 여정. <br className="hidden md:block" />
        깊이 있는 <b>기획전</b>으로 몰입하거나, 다양한 <b>카테고리</b>로 폭넓게 {getNavLabel("explore")}해보세요.
      </>
    ),
    svgSrc: "/images/decorations/owl.svg",
    className: "bg-bg-main border-t border-white/10",
    link: "/explore",
    linkText: `${getNavLabel("explore")} 페이지로 이동`,
  },
  scriptures: {
    id: "scriptures-section",
    title: `지혜의 ${getNavLabel("scriptures")}`,
    englishTitle: "Sacred Archives",
    description: `시대를 관통한 지혜가 잠든 곳. 인물들이 남긴 경전을 ${getNavLabel("explore")}하세요.`,
    svgSrc: "/images/decorations/scroll.svg",
    className: "bg-bg-main border-t border-white/10",
    link: "/scriptures",
    linkText: `${getNavLabel("scriptures")} 페이지로 이동`,
  },
  agora: {
    id: "agora-section",
    title: `소통의 ${getNavLabel("agora")}`,
    englishTitle: "Agora",
    description: `${getNavLabel("agora")}에서 피드와 게시판을 확인하세요.`,
    svgSrc: "/images/decorations/lyre.svg",
    className: "bg-bg-main border-t border-white/10",
    link: "/agora",
    linkText: `${getNavLabel("agora")} 페이지로 이동`,
  },
  arena: {
    id: "arena-section",
    title: "격돌의 전장",
    englishTitle: "Arena",
    description: "게임과 퀴즈로 지식을 겨루는 공간.",
    svgSrc: "/images/decorations/horn.svg",
    className: "bg-bg-main border-t border-white/10",
    link: "/arena",
    linkText: `${getNavLabel("arena")} 페이지로 이동`,
  },
  archive: {
    id: "archive-section",
    title: `나의 기록`,
    englishTitle: "Records",
    description: "책, 영화, 게임... 당신의 모든 영감을 기록하고 관리하세요.",
    svgSrc: "/images/decorations/vase.svg",
    className: "bg-bg-main border-t border-white/10",
    link: "/{userId}",
    linkText: "기록관 페이지로 이동",
  },
};

// 섹션 순서 (스크롤 네비게이션용)
export const SECTION_ORDER = [
  "home-banner",
  "explore-section",
  "scriptures-section",
  "agora-section",
  "arena-section",
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
  arena: {
    title: HOME_SECTIONS.arena.title,
    englishTitle: HOME_SECTIONS.arena.englishTitle,
  },
  archive: {
    titleSuffix: "의 기록관",
    englishTitle: "Official Sacred Record",
  },
} as const;
// #endregion
