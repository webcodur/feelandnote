/*
  ContentCard 상수 정의
*/
import { BookOpen, Film, Gamepad2, Music, Award } from "lucide-react";
import type { ContentType, ContentStatus } from "@/types/database";

export const TYPE_ICONS: Record<ContentType, typeof BookOpen> = {
  BOOK: BookOpen,
  VIDEO: Film,
  GAME: Gamepad2,
  MUSIC: Music,
  CERTIFICATE: Award,
};

export const STATUS_STYLES: Record<ContentStatus, { label: string; color: string }> = {
  WANT: { label: "관심", color: "text-status-wish" },
  FINISHED: { label: "감상", color: "text-status-completed" },
};

export const ASPECT_STYLES = {
  "2/3": "aspect-[2/3]",
  "3/4": "aspect-[3/4]",
};

export const TYPE_INFO: { type: ContentType; icon: typeof BookOpen; label: string; desc: string }[] = [
  { type: "BOOK", icon: BookOpen, label: "도서", desc: "책, 만화, 웹소설, 에세이 등" },
  { type: "VIDEO", icon: Film, label: "영상", desc: "영화, 드라마, 다큐멘터리, 애니메이션 등" },
  { type: "GAME", icon: Gamepad2, label: "게임", desc: "비디오 게임, 보드게임, 인디 게임 등" },
  { type: "MUSIC", icon: Music, label: "음악", desc: "앨범, 싱글, 클래식, 팟캐스트 등" },
  { type: "CERTIFICATE", icon: Award, label: "자격증", desc: "공부 중인 자격증이 있다면 등록하여 관리해 보세요" },
];
