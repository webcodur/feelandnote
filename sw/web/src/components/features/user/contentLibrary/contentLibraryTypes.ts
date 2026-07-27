/*
  파일명: contentLibraryTypes.ts
  기능: 콘텐츠 라이브러리 타입 및 헬퍼 함수
*/
import type { UserContentWithContent } from "@/actions/contents/getMyContents";
import type { GetUserContentsResponse, UserContentPublic } from "@/actions/contents/getUserContents";

// #region 타입
export type SortOption = "recent" | "title" | "rating_desc" | "rating_asc" | "creator";
export type ReviewFilter = "all" | "has_review" | "no_review";
export type ViewMode = "grid" | "list";
export type ContentLibraryMode = "owner" | "viewer";

export interface FlowInfo {
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
  defaultViewMode?: ViewMode;
  // viewer 모드 서버 렌더 초기 데이터. 있으면 첫 화면을 클라이언트 페치 없이 그린다.
  initialContents?: GetUserContentsResponse;
}

// #endregion

// #region 헬퍼 함수
/** viewer 모드 응답(UserContentPublic)을 서재 공용 형태(UserContentWithContent)로 매핑 */
export function mapPublicToUserContent(
  items: UserContentPublic[],
  targetUserId: string
): UserContentWithContent[] {
  return items.map((item) => ({
    id: item.id,
    content_id: item.content_id,
    user_id: targetUserId,
    status: item.status,
    visibility: item.visibility ?? 'public',
    created_at: item.created_at,
    updated_at: item.created_at, // viewer 모드에서는 created_at으로 대체
    completed_at: null,
    rating: item.public_record?.rating ?? null,
    review: item.public_record?.content_preview ?? null,
    review_en: item.public_record?.content_preview_en ?? null,
    is_recommended: false,
    is_spoiler: item.public_record?.is_spoiler ?? false,
    is_pinned: false,
    pinned_at: null,
    source_url: item.source_url,
    content: {
      id: item.content.id,
      type: item.content.type,
      title: item.content.title,
      creator: item.content.creator,
      thumbnail_url: item.content.thumbnail_url,
      description: null,
      publisher: null,
      release_date: null,
      metadata: item.content.metadata,
      user_count: item.content.user_count ?? null,
      title_ko: item.content.title_ko ?? null,
      title_en: item.content.title_en ?? null,
      creator_en: item.content.creator_en ?? null,
      isbn_en: item.content.isbn_en ?? null,
      thumbnail_en: item.content.thumbnail_en ?? null,
      has_en_edition: item.content.has_en_edition ?? null,
    },
  }));
}

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


export function formatMonthLabel(monthKey: string, locale = "ko"): string {
  const [year, month] = monthKey.split("-");
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, 1));
  return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "ko-KR", {
    year: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(date);
}

// #endregion
