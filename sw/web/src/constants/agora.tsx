/*
  파일명: /constants/agora.tsx
  기능: 광장 관련 상수 Single Source of Truth
  책임: 광장 메뉴 정보를 단일 원천으로 관리한다.
*/

import { Users, Megaphone, MessageCircle, MessageSquareText, type LucideIcon } from "lucide-react";

export interface AgoraItem {
  value: string;
  icon: LucideIcon;
  href: string;
}

/**
 * 광장 탭. 첫 항목이 광장 첫 화면(/agora)이다.
 * 친구 피드(/agora/social-feed)는 26.09.28에 걷었다 — 옛 주소는 소셜로 영구 이동(next.config.ts).
 */
export const AGORA_ITEMS: AgoraItem[] = [
  { value: "notice", icon: Megaphone, href: "/agora/board/notice" },
  { value: "free", icon: MessageSquareText, href: "/agora/board/free" },
  { value: "social", icon: Users, href: "/agora/social" },
  { value: "feedback", icon: MessageCircle, href: "/agora/board/feedback" },
];

/** 홈에서 여는 게시판끼리만 전환한다. 소셜·문의는 프로필 메뉴가 잇는다. */
export const AGORA_BOARD_ITEMS = AGORA_ITEMS.filter((item) => item.value === "notice" || item.value === "free");
