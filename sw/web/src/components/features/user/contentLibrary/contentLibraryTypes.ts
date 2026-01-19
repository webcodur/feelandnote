/*
  파일명: contentLibraryTypes.ts
  기능: 콘텐츠 라이브러리 타입 및 헬퍼 함수
*/
import type { ContentType, ContentStatus } from "@/types/database";
import type { UserContentWithContent } from "@/actions/contents/getMyContents";

// #region 타입
export type SortOption = "recent" | "title";
export type StatusFilter = "all" | ContentStatus;
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
  statusFilter: StatusFilter,
  sortOption: SortOption
): UserContentWithContent[] {
  let result = [...contents];

  if (statusFilter !== "all") {
    result = result.filter((item) => item.status === statusFilter);
  }


  result.sort((a, b) => {
    if (sortOption === "title") {
      return (a.content?.title ?? "").localeCompare(b.content?.title ?? "");
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

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
