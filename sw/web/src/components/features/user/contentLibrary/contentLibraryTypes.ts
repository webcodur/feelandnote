/*
  파일명: contentLibraryTypes.ts
  기능: 콘텐츠 라이브러리 타입 및 헬퍼 함수
*/
import type { ContentType, ContentStatus } from "@/types/database";
import type { UserContentWithContent } from "@/actions/contents/getMyContents";

// #region 타입
export type SortOption = "recent" | "title" | "rating_desc" | "rating_asc" | "creator";
export type ReviewFilter = "all" | "has_review" | "no_review";
export type ViewMode = "grid" | "list";
export type ContentLibraryMode = "owner" | "viewer";

export interface PlaylistInfo {
  id: string;
  name: string;
}

export interface UseContentLibraryOptions {
  maxItems?: number;
  compact?: boolean;
  showCategories?: boolean;
  mode?: ContentLibraryMode;
  targetUserId?: string;
  initialSearchQuery?: string;
}

export interface GroupedContents {
  all: UserContentWithContent[];
}

export interface TabOption {
  value: string;
  label: string;
  type?: ContentType;
}
// #endregion

// #region 헬퍼 함수
export function filterAndSortContents(
  contents: UserContentWithContent[],
  sortOption: SortOption
): UserContentWithContent[] {
  const result = [...contents];

  const sortFns: Record<SortOption, (a: UserContentWithContent, b: UserContentWithContent) => number> = {
    recent: (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    title: (a, b) => (a.content?.title ?? "").localeCompare(b.content?.title ?? ""),
    rating_desc: (a, b) => (b.rating ?? 0) - (a.rating ?? 0),
    rating_asc: (a, b) => (a.rating ?? 0) - (b.rating ?? 0),
    creator: (a, b) => (a.content?.creator ?? "").localeCompare(b.content?.creator ?? ""),
  };

  result.sort(sortFns[sortOption]);
  return result;
}

export function groupByMonth(contents: UserContentWithContent[]): Record<string, UserContentWithContent[]> {
  const groups: Record<string, UserContentWithContent[]> = {};

  contents.forEach((item) => {
    const date = new Date(item.created_at);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    if (!groups[monthKey]) groups[monthKey] = [];
    groups[monthKey].push(item);
  });

  return Object.fromEntries(
    Object.entries(groups).sort(([a], [b]) => b.localeCompare(a))
  );
}


export function formatMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split("-");
  return `${year}년 ${parseInt(month)}월`;
}

// #endregion
