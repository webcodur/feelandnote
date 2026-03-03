/*
  파일명: /constants/scriptures.tsx
  기능: 서고 관련 상수 Single Source of Truth
  책임: 서고 탭 정보를 단일 원천으로 관리한다.
*/

import { Scroll, Route, Clock, type LucideIcon } from "lucide-react";

export interface ScripturesTab {
  value: string;
  icon: LucideIcon;
  href: string;
}

export const SCRIPTURES_TABS: ScripturesTab[] = [
  { value: "era", icon: Clock, href: "/scriptures/era" },
  { value: "profession", icon: Route, href: "/scriptures/profession" },
  { value: "history", icon: Scroll, href: "/scriptures/history" },
];

// 4행 구조: 4x4x4x3 그리드 (갈림길 페이지용)
export const PROFESSION_ROWS = [
  ["entrepreneur", "investor", "commander", "leader"],
  ["politician", "scientist", "director", "humanities_scholar"],
  ["musician", "visual_artist", "actor", "athlete"],
  ["influencer", "author", "social_scientist"],
] as const;
