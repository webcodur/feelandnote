/*
  파일명: /constants/arena.tsx
  기능: 쉼터 관련 상수 Single Source of Truth
  책임: 쉼터 메뉴 정보를 단일 원천으로 관리한다.
*/

import { Clock, Crosshair, Swords, Crown, type LucideIcon } from "lucide-react";

// 섹션명
export const ARENA_SECTION_NAME = "쉼터";

export interface ArenaItem {
  value: string;
  label: string;
  icon: LucideIcon;
  href: string;
  description: string;
  hidden?: boolean; // true면 탭 UI에서 숨김 (URL 직접 접근은 가능)
}

export const ARENA_ITEMS: ArenaItem[] = [
  {
    value: "dawn",
    label: "여명",
    icon: Clock,
    href: "/rest/dawn",
    description: "인물들의 탄생 순서를 맞춰보세요",
  },
  {
    value: "labyrinth",
    label: "미궁",
    icon: Crosshair,
    href: "/rest/labyrinth",
    description: "단서를 모아 인물을 추적하세요",
  },
  {
    value: "hegemony",
    label: "패권",
    icon: Swords,
    href: "/rest/hegemony",
    description: "셀럽 카드로 전략 대전을 펼쳐보세요",
  },
  {
    value: "suikoden",
    label: "천도",
    icon: Crown,
    href: "/rest/suikoden",
    description: "역사 속 인물들로 문명을 통일하는 전략 시뮬레이션",
    hidden: true,
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
  dawn: {
    label: "DAWN",
    title: "여명",
    description: "시간의 순서를 꿰뚫어라",
    subDescription: "인물들을 태어난 순서대로 정렬해보세요.",
  },
  labyrinth: {
    label: "LABYRINTH",
    title: "미궁",
    description: "단서를 모아 정체를 밝혀라",
    subDescription: "점진적으로 공개되는 단서를 보고 인물을 맞춰보세요.",
  },
  hegemony: {
    label: "HEGEMONY",
    title: "패권",
    description: "강한 자가 지배한다",
    subDescription: "6개 영역에 셀럽 카드를 배치하여 AI와 대결하세요.",
  },
  suikoden: {
    label: "CHEONDO",
    title: "천도",
    description: "뜻이 있는 자, 천하를 얻으리라",
    subDescription: "역사 속 인물들을 이끌고 세력을 키워 문명을 통일하는 전략 시뮬레이션.",
  },
};
