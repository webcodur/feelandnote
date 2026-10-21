import { CONTENT_TYPE_FILTERS, type ContentTypeFilterValue } from "./categories";

export const DEFAULT_EXPLORE_CONTENT_TYPE: ContentTypeFilterValue = "BOOK";

export const EXPLORE_PREFERENCE_KEYS = [
  "profession", "nationality", "contentType", "contentPresence", "gender", "sortBy",
  "trendCountry", "pageSize", "reality", "byMin", "byMax",
] as const;

export const EXPLORE_FILTER_KEYS = [...EXPLORE_PREFERENCE_KEYS, "search", "page", "tagId", "tier"] as const;

export function parseExploreContentType(value: unknown): ContentTypeFilterValue {
  return CONTENT_TYPE_FILTERS.find(option => option.value === value)?.value ?? DEFAULT_EXPLORE_CONTENT_TYPE;
}
