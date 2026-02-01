/*
  파일명: /constants/navigation.tsx
  기능: 네비게이션 구조 Single Source of Truth
  책임: PC 헤더, MB 바텀탭, 메인페이지 섹션의 네비게이션 아이템을 단일 원천으로 관리한다.
*/

import { Compass, BookOpen, Armchair, MessageSquare, User, type LucideIcon } from "lucide-react";

// #region 타입 정의
export interface NavItem {
  key: string;
  href: string;
  label: string;
  icon: LucideIcon;
  showInHeader: boolean;
  showInBottomNav: boolean;
  showInHomePage: boolean;
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
    key: "lounge",
    href: "/lounge",
    label: "라운지",
    icon: Armchair,
    showInHeader: true,
    showInBottomNav: true,
    showInHomePage: true,
  },
  {
    key: "board",
    href: "/board",
    label: "게시판",
    icon: MessageSquare,
    showInHeader: true,
    showInBottomNav: true,
    showInHomePage: true,
  },
  {
    key: "archive",
    href: "/{userId}",
    label: "기록",
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
    linkText: `${getNavLabel("explore")}으로 이동`,
  },
  scriptures: {
    id: "scriptures-section",
    title: `지혜의 ${getNavLabel("scriptures")}`,
    englishTitle: "Sacred Archives",
    description: `시대를 관통한 지혜가 잠든 곳. 인물들이 남긴 경전을 ${getNavLabel("explore")}하세요.`,
    svgSrc: "/images/decorations/scroll.svg",
    className: "bg-bg-main border-t border-white/10",
    link: "/scriptures",
    linkText: `${getNavLabel("scriptures")}로 이동`,
  },
  lounge: {
    id: "lounge-section",
    title: `휴식의 ${getNavLabel("lounge")}`,
    englishTitle: "Lounge",
    description: `${getNavLabel("lounge")}에서 즐거움을 더해보세요.`,
    svgSrc: "/images/decorations/lyre.svg",
    className: "bg-bg-main border-t border-white/10",
    link: "/lounge",
    linkText: `${getNavLabel("lounge")}로 이동`,
  },
  board: {
    id: "board-section",
    title: `소통의 ${getNavLabel("board")}`,
    englishTitle: "Board",
    description: `${getNavLabel("board")}에서 공지사항을 확인하고 피드백을 남겨주세요.`,
    svgSrc: "/images/decorations/horn.svg",
    className: "bg-bg-main border-t border-white/10",
    link: "/board",
    linkText: `${getNavLabel("board")}으로 이동`,
  },
  archive: {
    id: "archive-section",
    title: `나의 ${getNavLabel("archive")}`,
    englishTitle: "Records",
    description: `책, 영화, 게임... 당신의 모든 영감을 ${getNavLabel("archive")}하고 관리하세요.`,
    svgSrc: "/images/decorations/vase.svg",
    className: "bg-bg-main border-t border-white/10",
    link: "/{userId}",
    linkText: `${getNavLabel("archive")}으로 이동`,
  },
};

// 섹션 순서 (스크롤 네비게이션용)
export const SECTION_ORDER = [
  "home-banner",
  "explore-section",
  "scriptures-section",
  "lounge-section",
  "board-section",
  "archive-section",
] as const;
// #endregion
