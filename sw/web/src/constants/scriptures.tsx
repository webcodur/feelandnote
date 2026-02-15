/*
  파일명: /constants/scriptures.tsx
  기능: 서고 관련 상수 Single Source of Truth
  책임: 서고 탭 정보를 단일 원천으로 관리한다.
*/

import { Scroll, Route, User, Clock, type LucideIcon } from "lucide-react";

// 섹션명
export const SCRIPTURES_SECTION_NAME = "지혜의 서고";

export interface ScripturesTab {
  value: string;
  label: string;
  icon: LucideIcon;
  href: string;
  description: string;
}

export const SCRIPTURES_TABS: ScripturesTab[] = [
  {
    value: "era",
    label: "불후의 명작",
    icon: Clock,
    href: "/scriptures/era",
    description: "전 시대의 대표작과 시대별 명저",
  },
  {
    value: "profession",
    label: "갈림길",
    icon: Route,
    href: "/scriptures/profession",
    description: "직업별 추천 콘텐츠",
  },
];

// 4행 구조: 4x4x4x3 그리드 (갈림길 페이지용)
export const PROFESSION_ROWS = [
  ["entrepreneur", "investor", "commander", "leader"],
  ["politician", "scientist", "director", "humanities_scholar"],
  ["musician", "visual_artist", "actor", "athlete"],
  ["influencer", "author", "social_scientist"],
] as const;

// 헬퍼: 페이지 타이틀 생성
export const getScripturesPageTitle = (tabValue?: string) => {
  if (!tabValue) return SCRIPTURES_SECTION_NAME;
  const tab = SCRIPTURES_TABS.find((t) => t.value === tabValue);
  return tab ? `${tab.label} | ${SCRIPTURES_SECTION_NAME}` : SCRIPTURES_SECTION_NAME;
};
