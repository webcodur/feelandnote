/*
  파일명: /constants/arena.tsx
  기능: 쉼터 관련 상수 Single Source of Truth
  책임: 쉼터 메뉴 정보를 단일 원천으로 관리한다.
*/

import { Clock, Crosshair, Swords, Crown, type LucideIcon } from "lucide-react";

export interface ArenaItem {
  value: string;
  icon: LucideIcon;
  href: string;
  hidden?: boolean; // true면 탭 UI에서 숨김 (URL 직접 접근은 가능)
}

export const ARENA_ITEMS: ArenaItem[] = [
  { value: "dawn", icon: Clock, href: "/rest/dawn" },
  { value: "labyrinth", icon: Crosshair, href: "/rest/labyrinth" },
  { value: "hegemony", icon: Swords, href: "/rest/hegemony" },
  { value: "suikoden", icon: Crown, href: "/rest/suikoden" },
];

// 영문 라벨 (ARENA_SECTION_HEADERS.label 대체용 — i18n에서 관리하지 않는 고정 영문)
export const ARENA_ENGLISH_LABELS: Record<string, string> = {
  dawn: "DAWN",
  labyrinth: "LABYRINTH",
  hegemony: "HEGEMONY",
  suikoden: "CHEONDO",
};
