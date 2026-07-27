/*
  ContentCard 상수 정의
*/
import { BookOpen, Film, Gamepad2, Music } from "lucide-react";
import type { ContentType } from "@/types/database";

export const TYPE_ICONS: Record<ContentType, typeof BookOpen> = {
  BOOK: BookOpen,
  VIDEO: Film,
  GAME: Gamepad2,
  MUSIC: Music,
};

export const ASPECT_STYLES = {
  "2/3": "aspect-[2/3]",
  "3/4": "aspect-[3/4]",
};

export const TYPE_INFO: { type: ContentType; icon: typeof BookOpen }[] = [
  { type: "BOOK", icon: BookOpen },
  { type: "VIDEO", icon: Film },
  { type: "GAME", icon: Gamepad2 },
  { type: "MUSIC", icon: Music },
];
