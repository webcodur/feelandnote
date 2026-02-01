/*
  파일명: /constants/lounge.tsx
  기능: 라운지 관련 상수 Single Source of Truth
  책임: 라운지 메뉴 정보를 단일 원천으로 관리한다.
*/

import { Rss, Scale, Clock, Trophy, type LucideIcon } from "lucide-react";

// 섹션명
export const LOUNGE_SECTION_NAME = "라운지";

export interface LoungeItem {
  value: string;
  label: string;
  icon: LucideIcon;
  href: string;
  description: string;
  status: "available" | "coming-soon";
}

export const LOUNGE_ITEMS: LoungeItem[] = [
  {
    value: "feed",
    label: "피드",
    icon: Rss,
    href: "/feed",
    description: "친구들의 최신 소식을 확인하세요",
    status: "available",
  },
  {
    value: "higher-lower",
    label: "업다운",
    icon: Scale,
    href: "/lounge/higher-lower",
    description: "두 인물 중 더 높은 평점을 맞춰보세요",
    status: "available",
  },
  {
    value: "timeline",
    label: "연대기",
    icon: Clock,
    href: "/lounge/timeline",
    description: "인물들의 활동 시기를 맞춰보세요",
    status: "available",
  },
  {
    value: "tier-list",
    label: "티어리스트",
    icon: Trophy,
    href: "/lounge/tier-list",
    description: "나만의 콘텐츠 순위표를 만들어보세요",
    status: "coming-soon",
  },
];

// 헬퍼: 페이지 타이틀 생성
export const getLoungePageTitle = (itemValue?: string) => {
  if (!itemValue) return LOUNGE_SECTION_NAME;
  const item = LOUNGE_ITEMS.find((i) => i.value === itemValue);
  return item ? `${item.label} | ${LOUNGE_SECTION_NAME}` : LOUNGE_SECTION_NAME;
};
