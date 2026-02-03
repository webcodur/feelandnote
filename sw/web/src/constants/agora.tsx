/*
  파일명: /constants/agora.tsx
  기능: 광장 관련 상수 Single Source of Truth
  책임: 광장 메뉴 정보를 단일 원천으로 관리한다.
*/

import { Sparkles, Users, Megaphone, MessageCircle, type LucideIcon } from "lucide-react";

// 섹션명
export const AGORA_SECTION_NAME = "광장";

export interface AgoraItem {
  value: string;
  label: string;
  icon: LucideIcon;
  href: string;
  description: string;
}

export const AGORA_ITEMS: AgoraItem[] = [
  {
    value: "celeb-feed",
    label: "셀럽 피드",
    icon: Sparkles,
    href: "/agora/celeb-feed",
    description: "셀럽들의 아카이브를 확인하세요",
  },
  {
    value: "friend-feed",
    label: "친구 피드",
    icon: Users,
    href: "/agora/friend-feed",
    description: "친구들의 최신 소식을 확인하세요",
  },
  {
    value: "notice",
    label: "공지사항",
    icon: Megaphone,
    href: "/agora/board/notice",
    description: "서비스 공지사항을 확인하세요",
  },
  {
    value: "feedback",
    label: "피드백",
    icon: MessageCircle,
    href: "/agora/board/feedback",
    description: "의견과 피드백을 남겨주세요",
  },
];

// 헬퍼: 페이지 타이틀 생성
export const getAgoraPageTitle = (itemValue?: string) => {
  if (!itemValue) return AGORA_SECTION_NAME;
  const item = AGORA_ITEMS.find((i) => i.value === itemValue);
  return item ? `${item.label} | ${AGORA_SECTION_NAME}` : AGORA_SECTION_NAME;
};
