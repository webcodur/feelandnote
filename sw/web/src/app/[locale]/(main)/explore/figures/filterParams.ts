import { parseExploreSort } from "@/constants/celebSort";
import { parseCelebRealities } from "@feelandnote/shared/constants/celeb-tiers";
import type { FiguresFilterParams } from "./sections";
import { parseExploreContentPresence } from "@/constants/celebContentPresence";
import { DEFAULT_EXPLORE_PROFESSION } from "@/constants/celebProfessions";
import { parseTrendCountry } from "@/constants/trendCountries";
import { listingPage, listingPageSize, CELEB_LISTING_LIMITS } from "@/constants/celebListingPolicy";
import { EXPLORE_FILTER_KEYS, parseExploreContentType } from "@/constants/exploreFilters";
import { filterSelection, serializeFilterSelection } from "@/constants/celebFilterSelection";

// URL searchParams에서 필터/정렬 값 파싱
function parseParam(params: Record<string, string | string[] | undefined>, key: string): string | undefined {
  const v = params[key];
  return typeof v === "string" ? v : undefined;
}

// 그리드 뷰인지 판단: 필터 파라미터가 있으면 그리드
export function isGridView(params: Record<string, string | string[] | undefined>): boolean {
  return EXPLORE_FILTER_KEYS.some((key) => {
    const v = params[key];
    return typeof v === "string" && v.length > 0;
  });
}

export function parseFilterParams(params: Record<string, string | string[] | undefined>): FiguresFilterParams {
  const notAll = (v?: string) => (v && v !== "all" ? v : undefined);
  const sortByRaw = parseParam(params, "sortBy");
  const sortBy = parseExploreSort(sortByRaw);
  const pageRaw = parseInt(parseParam(params, "page") || "1", 10);
  const pageSizeRaw = parseInt(parseParam(params, "pageSize") || "24", 10);
  const pageSize = listingPageSize(pageSizeRaw);
  const page = listingPage(pageRaw, pageSize);
  const parseYear = (v?: string) => {
    if (!v) return undefined;
    const year = parseInt(v, 10);
    return isNaN(year) ? undefined : year;
  };

  return {
    page,
    pageSize,
    sortBy,
    trendCountry: parseTrendCountry(parseParam(params, "trendCountry")),
    // 실존 축 필터. 미지정이면 getCelebs가 기본(REAL·BOTH, FICTION 제외)만 노출한다.
    realities: parseCelebRealities(parseParam(params, "reality")),
    profession: notAll(serializeFilterSelection(filterSelection(parseParam(params, "profession") || DEFAULT_EXPLORE_PROFESSION))),
    nationality: notAll(serializeFilterSelection(filterSelection(parseParam(params, "nationality")))),
    contentType: notAll(parseExploreContentType(parseParam(params, "contentType"))),
    contentPresence: parseExploreContentPresence(parseParam(params, "contentPresence"), parseParam(params, "tier")),
    gender: notAll(parseParam(params, "gender")),
    search: parseParam(params, "search")?.slice(0, CELEB_LISTING_LIMITS.searchLength) || undefined,
    factionId: notAll(parseParam(params, "tagId")),
    birthYearMin: parseYear(parseParam(params, "byMin")),
    birthYearMax: parseYear(parseParam(params, "byMax")),
  };
}

