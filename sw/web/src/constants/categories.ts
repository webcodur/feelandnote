import { Book, Film, Gamepad2, Music, Award } from "lucide-react";
import { ScrollIcon, TheaterMaskIcon, MosaicCoinIcon, LyreIcon, LaurelIcon } from "@/components/ui/icons/neo-pantheon";
import type { ContentType } from "@/types/database";

// 콘텐츠 카테고리 ID (DB 저장용)
export type CategoryId = "all" | "book" | "video" | "game" | "music" | "certificate";

// 콘텐츠 타입 필터 값 (all 포함)
export type ContentTypeFilterValue = "all" | ContentType;

// 영상 서브타입 (TMDB 결과 구분용)
export type VideoSubtype = "movie" | "tv";

// 카테고리 설정 타입
export interface CategoryConfig {
  id: CategoryId;
  label: string;
  shortLabel: string; // 축약 라벨 (BOOK, VIDEO 등)
  icon: React.ComponentType<any>; // 테마 아이콘 (neo-pantheon)
  lucideIcon: React.ComponentType<any>; // 범용 아이콘 (lucide-react)
  placeholder: string; // 검색용
  dbType: ContentType; // DB 저장값
  unit: string; // 콘텐츠 단위 (권, 편, 개 등)
  creatorLabel: string; // 창작자 라벨 (저자, 감독 등)
}

// 전체 카테고리 목록 (Single Source of Truth)
export const CATEGORIES: CategoryConfig[] = [
  { id: "book", label: "도서", shortLabel: "BOOK", icon: ScrollIcon, lucideIcon: Book, placeholder: "책 제목, 저자...", dbType: "BOOK", unit: "권", creatorLabel: "저자" },
  { id: "video", label: "영상", shortLabel: "VIDEO", icon: TheaterMaskIcon, lucideIcon: Film, placeholder: "영화, 드라마, 애니...", dbType: "VIDEO", unit: "편", creatorLabel: "감독" },
  { id: "game", label: "게임", shortLabel: "GAME", icon: MosaicCoinIcon, lucideIcon: Gamepad2, placeholder: "게임 제목, 개발사...", dbType: "GAME", unit: "개", creatorLabel: "개발사" },
  { id: "music", label: "음악", shortLabel: "MUSIC", icon: LyreIcon, lucideIcon: Music, placeholder: "앨범, 아티스트...", dbType: "MUSIC", unit: "곡", creatorLabel: "아티스트" },
  { id: "certificate", label: "자격증", shortLabel: "CERT", icon: LaurelIcon, lucideIcon: Award, placeholder: "자격증명, 분야...", dbType: "CERTIFICATE", unit: "개", creatorLabel: "발급기관" },
] as const;

// ContentType → CategoryId 매핑
export const TYPE_TO_CATEGORY_ID: Record<ContentType, CategoryId> = {
  BOOK: "book",
  VIDEO: "video",
  GAME: "game",
  MUSIC: "music",
  CERTIFICATE: "certificate",
};

// CategoryId → ContentType 매핑 (all은 undefined)
export const CATEGORY_ID_TO_TYPE: Record<CategoryId, ContentType | undefined> = {
  all: undefined,
  book: "BOOK",
  video: "VIDEO",
  game: "GAME",
  music: "MUSIC",
  certificate: "CERTIFICATE",
};

// 콘텐츠 타입별 단위 조회
export const getContentUnit = (dbType: string): string => {
  const category = getCategoryByDbType(dbType);
  return category?.unit ?? "개";
};

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
