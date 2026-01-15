import { Book, Film, Gamepad2, Music, Award } from "lucide-react";
import type { LucideIcon } from "lucide-react";

// 콘텐츠 카테고리 ID (DB 저장용)
export type CategoryId = "book" | "video" | "game" | "music" | "certificate";

// 콘텐츠 타입 필터 값 (all 포함)
export type ContentTypeFilterValue = "all" | "BOOK" | "VIDEO" | "GAME" | "MUSIC" | "CERTIFICATE";

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
  { id: "music", label: "음악", icon: Music, placeholder: "앨범, 아티스트...", dbType: "MUSIC" },
  { id: "certificate", label: "자격증", icon: Award, placeholder: "자격증명, 분야...", dbType: "CERTIFICATE" },
] as const;

// 유틸리티 함수
export const getCategoryById = (id: CategoryId): CategoryConfig | undefined =>
  CATEGORIES.find((c) => c.id === id);

export const getCategoryByDbType = (dbType: string): CategoryConfig | undefined =>
  CATEGORIES.find((c) => c.dbType === dbType);

// 콘텐츠 타입 필터 (전체 옵션 포함, 필터 UI용)
export interface ContentTypeFilter {
  value: ContentTypeFilterValue;
  label: string;
}

export const CONTENT_TYPE_FILTERS: ContentTypeFilter[] = [
  { value: "all", label: "전체" },
  ...CATEGORIES.map((c) => ({ value: c.dbType as ContentTypeFilterValue, label: c.label })),
];
