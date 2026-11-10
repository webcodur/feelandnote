/*
  파일명: contentLibraryTypes.ts
  기능: 콘텐츠 라이브러리 타입 및 헬퍼 함수
*/
import type { UserContentWithContent } from "@/actions/contents/getMyContents";
import type { GetUserContentsResponse } from "@/actions/contents/getUserContents";
import type { ContentBrief } from "@/actions/contents/getContentBrief";
import type { CategoryId } from "@/constants/categories";
import { hasKoreanBookPurchase } from "./contentAffiliate";

// #region 타입
export type SortOption = "recent" | "title" | "rating_desc" | "rating_asc" | "creator";
export type ReviewFilter = "all" | import("@/types/database").ContentStatus;
/** list=목록 · expand=목록에서 고른 한 건을 넓게 보기 */
export type ViewMode = "list" | "expand";
export type ContentLibraryMode = "owner" | "viewer";
/** 이 서가의 임자가 회원인지 인물인지. 감상 기록이 서로 다른 테이블에 있어 조회 경로가 갈린다 */
export type ContentOwnerKind = "member" | "celeb";

export interface FlowInfo {
  id: string;
  name: string;
}

export interface UseContentLibraryOptions {
  /** 상위 선택기가 정한 매체. 지정하면 내부 선택보다 우선한다. */
  activeTab?: CategoryId;
  maxItems?: number;
  compact?: boolean;
  showCategories?: boolean;
  mode?: ContentLibraryMode;
  ownerKind?: ContentOwnerKind;
  targetUserId?: string;
  initialSearchQuery?: string;
  defaultViewMode?: ViewMode;
  defaultPageSize?: number;
  // viewer 모드 서버 렌더 초기 데이터. 있으면 첫 화면을 클라이언트 페치 없이 그린다.
  initialContents?: GetUserContentsResponse;
  /** 펼침 첫 카드용 서버 렌더 소개. null도 조회가 끝난 정상 결과다. */
  initialContentBrief?: ContentBrief | null;
}

// #endregion

// #region 헬퍼 함수
export { mapPublicToUserContent } from "@/components/shared/ContentReading/mapPublicContents";

export function filterAndSortContents(
  contents: UserContentWithContent[],
  sortOption: SortOption,
  purchasableFirst = false,
): UserContentWithContent[] {
  const result = [...contents];

  const sortFns: Record<SortOption, (a: UserContentWithContent, b: UserContentWithContent) => number> = {
    recent: (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    title: (a, b) => (a.content?.title ?? "").localeCompare(b.content?.title ?? ""),
    rating_desc: (a, b) => (b.rating ?? 0) - (a.rating ?? 0),
    rating_asc: (a, b) => (a.rating ?? 0) - (b.rating ?? 0),
    creator: (a, b) => (a.content?.creator ?? "").localeCompare(b.content?.creator ?? ""),
  };

  result.sort((a, b) => {
    if (purchasableFirst) {
      const purchaseOrder = Number(hasKoreanBookPurchase(b)) - Number(hasKoreanBookPurchase(a));
      if (purchaseOrder !== 0) return purchaseOrder;
    }
    return sortFns[sortOption](a, b);
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
