import type { UserContentWithContent } from "@/actions/contents/getMyContents";
import type { GetUserContentsResponse } from "@/actions/contents/getUserContents";
import { CATEGORY_ID_TO_TYPE, type CategoryId } from "@/constants/categories";
import type { ContentType } from "@/types/database";

import {
  mapPublicToUserContent,
  type ContentOwnerKind,
  type ReviewFilter,
  type SortOption,
  type ViewMode,
} from "./contentLibraryTypes";

const EXPAND_LIMIT = 200;

type RequestSortOption = Extract<
  SortOption,
  "recent" | "rating_desc" | "rating_asc"
>;

export interface ContentLibraryDataOptions {
  activeTab: CategoryId;
  appliedSearchQuery: string;
  compact: boolean;
  currentPage: number;
  defaultPageSize: number;
  initialContents?: GetUserContentsResponse;
  initialSearchQuery: string;
  isViewer: boolean;
  isResponsiveViewPending: boolean;
  maxItems?: number;
  ownerKind: ContentOwnerKind;
  pageSize: number;
  reviewFilter: ReviewFilter;
  sortOption: SortOption;
  targetUserId?: string;
  viewMode: ViewMode;
}

export type ContentDatasetMode = ViewMode | "seed";

export interface LibrarySeed {
  contents: UserContentWithContent[];
  totalPages: number;
  total: number;
}

interface ContentRequestInput {
  activeTab: CategoryId;
  appliedSearchQuery: string;
  compact: boolean;
  currentPage: number;
  maxItems?: number;
  ownerKind: ContentOwnerKind;
  pageSize: number;
  reviewFilter: ReviewFilter;
  sortOption: SortOption;
  viewMode: ViewMode;
}

export interface ContentRequest {
  type: ContentType | undefined;
  page: number;
  limit: number;
  search: string | undefined;
  hasReview: boolean | undefined;
  sortBy: RequestSortOption;
}

export function createLibrarySeed(
  options: ContentLibraryDataOptions,
): LibrarySeed | null {
  const { initialContents, initialSearchQuery, isViewer, targetUserId } = options;
  if (!isViewer || !targetUserId || !initialContents || initialSearchQuery.trim().length >= 2) {
    return null;
  }
  return {
    contents: mapPublicToUserContent(initialContents.items, targetUserId),
    totalPages: initialContents.totalPages,
    total: initialContents.total,
  };
}

export function createContentRequest(input: ContentRequestInput): ContentRequest {
  const isExpand = input.viewMode === "expand";
  const trimmedSearch = input.appliedSearchQuery.trim();
  const requestedSort = (["recent", "rating_desc", "rating_asc"] as const).includes(
    input.sortOption as RequestSortOption,
  ) ? input.sortOption as RequestSortOption : "recent";

  return {
    type: CATEGORY_ID_TO_TYPE[input.activeTab],
    page: isExpand || input.compact ? 1 : input.currentPage,
    limit: isExpand ? EXPAND_LIMIT : input.maxItems || input.pageSize,
    search: trimmedSearch.length >= 2 ? trimmedSearch : undefined,
    hasReview: input.reviewFilter === "all"
      ? undefined
      : input.reviewFilter === "has_review",
    sortBy: input.ownerKind === "celeb" ? "recent" : requestedSort,
  };
}

export function isInitialSeedQuery(options: ContentLibraryDataOptions): boolean {
  return options.activeTab === "all"
    && options.currentPage === 1
    && options.pageSize === options.defaultPageSize
    && options.appliedSearchQuery.trim().length < 2
    && options.reviewFilter === "all"
    && options.sortOption === "recent"
    && options.viewMode !== "expand";
}

export function resolveDatasetPresentation(
  contentsMode: ContentDatasetMode | null,
  requestedViewMode: ViewMode,
  isLoading: boolean,
) {
  const isStaleExpandDatasetForList = contentsMode === "expand" && requestedViewMode === "list";
  return {
    isStaleExpandDatasetForList,
    presentationViewMode: isStaleExpandDatasetForList ? "expand" : requestedViewMode,
    shouldKeepContents: contentsMode !== null,
    shouldShowBlockingLoading: isLoading,
  };
}
