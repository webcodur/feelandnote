/*
  파일명: /constants/agora.tsx
  기능: 광장 관련 상수 Single Source of Truth
  책임: 광장 메뉴 정보를 단일 원천으로 관리한다.
*/

import { Users, Rss, Megaphone, MessageCircle, MessageSquareText, type LucideIcon } from "lucide-react";

export interface AgoraItem {
  value: string;
  icon: LucideIcon;
  href: string;
}

export const AGORA_ITEMS: AgoraItem[] = [
  { value: "free", icon: MessageSquareText, href: "/agora/board/free" },
  { value: "social", icon: Users, href: "/agora/social" },
  { value: "social-feed", icon: Rss, href: "/agora/social-feed" },
  { value: "notice", icon: Megaphone, href: "/agora/board/notice" },
  { value: "feedback", icon: MessageCircle, href: "/agora/board/feedback" },
];
