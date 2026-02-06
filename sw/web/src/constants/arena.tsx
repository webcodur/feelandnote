/*
  파일명: /constants/arena.tsx
  기능: 전장 관련 상수 Single Source of Truth
  책임: 전장 메뉴 정보를 단일 원천으로 관리한다.
*/

import { Scale, Clock, MessageCircle, type LucideIcon } from "lucide-react";

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
    value: "up-down",
    label: "용호상박",
    icon: Scale,
    href: "/arena/up-down",
    description: "두 인물 중 더 높은 평점을 맞춰보세요",
  },
  {
    value: "time-puzzle",
    label: "장유유서",
    icon: Clock,
    href: "/arena/time-puzzle",
    description: "인물들의 탄생 순서를 맞춰보세요",
  },
  {
    value: "quote",
    label: "온고지신",
    icon: MessageCircle,
    href: "/arena/quote",
    description: "명언을 보고 인물을 맞춰보세요",
  },
];

// 헬퍼: 페이지 타이틀 생성
export const getArenaPageTitle = (itemValue?: string) => {
  if (!itemValue) return ARENA_SECTION_NAME;
  const item = ARENA_ITEMS.find((i) => i.value === itemValue);
  return item ? `${item.label} | ${ARENA_SECTION_NAME}` : ARENA_SECTION_NAME;
};

// 섹션 헤더 정보
export interface SectionHeaderInfo {
  label: string;
  title: string;
  description: string;
  subDescription?: string;
}

export const ARENA_SECTION_HEADERS: Record<string, SectionHeaderInfo> = {
  "up-down": {
    label: "INFLUENCE DUEL",
    title: "용호상박",
    description: "막상막하의 대결",
    subDescription: "두 거인을 저울에 올리며 영향력의 무게를 가늠해보세요.",
  },
  "time-puzzle": {
    label: "CHRONOS PUZZLE",
    title: "장유유서",
    description: "선후의 질서",
    subDescription: "위인들의 선후를 가리며 시간의 질서를 세워보세요.",
  },
  quote: {
    label: "QUOTE BLIND",
    title: "온고지신",
    description: "옛 지혜의 발견",
    subDescription: "금언의 주인을 가리며 옛 지혜를 되새겨보세요.",
  },
};
