import { Book, Film, Gamepad2, Drama, Music } from "lucide-react";
import type { LucideIcon } from "lucide-react";

// 콘텐츠 카테고리 ID (DB 저장용)
export type CategoryId = "book" | "video" | "game" | "performance" | "music";

// 영상 서브타입 (TMDB 결과 구분용)
export type VideoSubtype = "movie" | "tv";

// 카테고리 설정 타입
export interface CategoryConfig {
  id: CategoryId;
  label: string;
  icon: LucideIcon;
  placeholder: string; // 검색용
  dbType: string; // DB 저장값
}

// 전체 카테고리 목록 (Single Source of Truth)
export const CATEGORIES: CategoryConfig[] = [
  { id: "book", label: "도서", icon: Book, placeholder: "책 제목, 저자...", dbType: "BOOK" },
  { id: "video", label: "영상", icon: Film, placeholder: "영화, 드라마, 애니...", dbType: "VIDEO" },
  { id: "game", label: "게임", icon: Gamepad2, placeholder: "게임 제목, 개발사...", dbType: "GAME" },
  { id: "performance", label: "공연", icon: Drama, placeholder: "뮤지컬, 연극, 콘서트...", dbType: "PERFORMANCE" },
  { id: "music", label: "음악", icon: Music, placeholder: "앨범, 아티스트...", dbType: "MUSIC" },
] as const;

// 유틸리티 함수
export const getCategoryById = (id: CategoryId): CategoryConfig | undefined =>
  CATEGORIES.find((c) => c.id === id);

export const getCategoryByDbType = (dbType: string): CategoryConfig | undefined =>
  CATEGORIES.find((c) => c.dbType === dbType);

// DB 저장용 타입 (database.ts의 ContentType과 동기화 필요)
export type ContentType = CategoryConfig["dbType"];
