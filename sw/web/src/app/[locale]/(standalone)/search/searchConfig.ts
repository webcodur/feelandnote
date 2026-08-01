/*
  파일명: /app/(standalone)/search/searchConfig.ts
  기능: 검색 페이지 공유 상수·타입
  책임: 검색 모드/정렬 옵션/카테고리 매핑 상수를 정의한다.
*/ // ------------------------------

import type { ContentSearchResult, RecordsSearchResult } from "@/actions/search";
import { getCategoryById, type CategoryId } from "@/constants/categories";
import type { ContentType } from "@/types/database";

export type SearchMode = "content" | "user" | "tag" | "records";
export type ContentResult = ContentSearchResult | RecordsSearchResult;

// 카테고리별 검색 안내 문구 키
export const CATEGORY_SEARCH_GUIDE_KEYS: Partial<Record<CategoryId, string>> = {
  game: "guide.game",
};

// 카테고리별 API 출처 URL
export const API_SOURCE_URL: Record<Exclude<CategoryId, "all">, string> = {
  book: "https://developers.kakao.com/docs/latest/ko/daum-search/dev-guide#search-book",
  video: "https://www.themoviedb.org",
  game: "https://www.igdb.com",
  music: "https://developer.spotify.com",
};

export const CONTENT_SORT_OPTIONS = [
  { key: "relevance", value: "relevance" },
  { key: "latest", value: "latest" },
  { key: "popular", value: "popular" },
];

export const USER_SORT_OPTIONS = [
  { key: "relevance", value: "relevance" },
  { key: "followers", value: "followers" },
  { key: "latest", value: "latest" },
];

export const categoryToContentType = (category: string): ContentType => {
  const config = getCategoryById(category as CategoryId);
  return (config?.dbType as ContentType) || "BOOK";
};
