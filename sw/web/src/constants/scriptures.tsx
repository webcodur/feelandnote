/*
  파일명: /constants/scriptures.tsx
  기능: 서가 관련 상수 Single Source of Truth
  책임: 서가 탭 정보를 단일 원천으로 관리한다.
*/

import { Scroll, Route, Clock, GraduationCap, type LucideIcon } from "lucide-react";

export interface ScripturesTab {
  value: string;
  icon: LucideIcon;
  href: string;
}

export const SCRIPTURES_TABS: ScripturesTab[] = [
  { value: "era", icon: Clock, href: "/scriptures/era" },
  { value: "profession", icon: Route, href: "/scriptures/profession" },
  { value: "museum", icon: Scroll, href: "/scriptures/museum" },
  { value: "academy", icon: GraduationCap, href: "/scriptures/academy" },
];

// 5행 3열 그리드 (갈림길 페이지용) — 긴 라벨과 짧은 라벨을 교차 배치
export const PROFESSION_ROWS = [
  ["entrepreneur", "investor", "scientist"],       // 1행: 기업가 + 투자자 + 과학자
  ["politician", "commander", "leader"],           // 2행: 정치인 + 지휘관 + 지도자
  ["director", "influencer", "visual_artist"],     // 3행: 감독 + 인플루엔서 + 미술인
  ["author", "social_scientist", "musician"],      // 4행: 작가 + 사회과학자 + 음악인
  ["actor", "humanities_scholar", "athlete"],      // 5행: 배우 + 인문학자 + 스포츠인
] as const;

// 영문 로케일용 직군 순서 — 긴 라벨(Humanities Scholar, Social Scientist 등) 분산 배치
export const PROFESSION_ROWS_EN = [
  ["entrepreneur", "investor", "scientist"],       // 12+8+9 = 29
  ["politician", "commander", "leader"],           // 10+9+6 = 25
  ["director", "influencer", "visual_artist"],     // 8+10+13 = 31
  ["author", "social_scientist", "musician"],      // 6+16+8 = 30
  ["actor", "humanities_scholar", "athlete"],       // 5+18+7 = 30
] as const;
