/*
  파일명: /constants/agora.tsx
  기능: 광장 관련 상수 Single Source of Truth
  책임: 광장 메뉴 정보를 단일 원천으로 관리한다.
*/

import { Sparkles, Users, Megaphone, MessageCircle, type LucideIcon } from "lucide-react";

export interface AgoraItem {
  value: string;
  icon: LucideIcon;
  href: string;
}

export const AGORA_ITEMS: AgoraItem[] = [
  { value: "celeb-feed", icon: Sparkles, href: "/agora/celeb-feed" },
  { value: "friend-feed", icon: Users, href: "/agora/friend-feed" },
  { value: "notice", icon: Megaphone, href: "/agora/board/notice" },
  { value: "feedback", icon: MessageCircle, href: "/agora/board/feedback" },
];
