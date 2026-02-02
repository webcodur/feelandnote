/*
  파일명: /constants/arena.tsx
  기능: 전장 관련 상수 Single Source of Truth
  책임: 전장 메뉴 정보를 단일 원천으로 관리한다.
*/

import { Scale, Clock, Trophy, type LucideIcon } from "lucide-react";

// 섹션명
export const ARENA_SECTION_NAME = "전장";

export interface ArenaItem {
  value: string;
  label: string;
  icon: LucideIcon;
  href: string;
  description: string;
}

export const ARENA_ITEMS: ArenaItem[] = [
  {
    value: "higher-lower",
    label: "업다운",
    icon: Scale,
    href: "/arena/higher-lower",
    description: "두 인물 중 더 높은 평점을 맞춰보세요",
  },
  {
    value: "timeline",
    label: "타임 퍼즐",
    icon: Clock,
    href: "/arena/timeline",
    description: "콘텐츠의 시간 순서를 맞춰보세요",
  },
  {
    value: "tier-list",
    label: "티어리스트",
    icon: Trophy,
    href: "/arena/tier-list",
    description: "나만의 콘텐츠 순위표를 만들어보세요",
  },
];

// 헬퍼: 페이지 타이틀 생성
export const getArenaPageTitle = (itemValue?: string) => {
  if (!itemValue) return ARENA_SECTION_NAME;
  const item = ARENA_ITEMS.find((i) => i.value === itemValue);
  return item ? `${item.label} | ${ARENA_SECTION_NAME}` : ARENA_SECTION_NAME;
};
