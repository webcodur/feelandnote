/*
  파일명: /constants/arena.tsx
  기능: 쉼터 관련 상수 Single Source of Truth
  책임: 쉼터 메뉴 정보를 단일 원천으로 관리한다.
*/

import { Scale, Clock, MessageCircle, type LucideIcon } from "lucide-react";

// 섹션명
export const ARENA_SECTION_NAME = "쉼터";

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
    label: "업다운",
    icon: Scale,
    href: "/rest/up-down",
    description: "두 인물 중 더 높은 평점을 맞춰보세요",
  },
  {
    value: "time-puzzle",
    label: "타임퍼즐",
    icon: Clock,
    href: "/rest/time-puzzle",
    description: "인물들의 탄생 순서를 맞춰보세요",
  },
  {
    value: "quote",
    label: "인물찾기",
    icon: MessageCircle,
    href: "/rest/quote",
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
    label: "UP DOWN",
    title: "업다운",
    description: "누가 더 높을까?",
    subDescription: "두 인물 중 영향력 점수가 더 높은 사람을 맞춰보세요.",
  },
  "time-puzzle": {
    label: "TIME PUZZLE",
    title: "타임퍼즐",
    description: "시간 순서 맞추기",
    subDescription: "인물들을 태어난 순서대로 정렬해보세요.",
  },
  quote: {
    label: "GUESS WHO",
    title: "인물찾기",
    description: "누구의 명언일까?",
    subDescription: "명언을 읽고 어떤 인물이 남긴 말인지 맞춰보세요.",
  },
};
