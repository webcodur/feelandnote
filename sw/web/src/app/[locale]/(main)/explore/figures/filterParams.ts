import { parseExploreSort } from "@/constants/celebSort";
import { parseCelebTiers, parseCelebRealities } from "@feelandnote/shared/constants/celeb-tiers";
import type { FiguresFilterParams } from "./sections";
import { DEFAULT_CELEB_CONTENT_PRESENCE, parseCelebContentPresence } from "@/constants/celebContentPresence";
import { DEFAULT_EXPLORE_PROFESSION } from "@/constants/celebProfessions";
import { parseTrendCountry } from "@/constants/trendCountries";

// URL searchParams에서 필터/정렬 값 파싱
function parseParam(params: Record<string, string | string[] | undefined>, key: string): string | undefined {
  const v = params[key];
  return typeof v === "string" ? v : undefined;
}

// 그리드 뷰인지 판단: 필터 파라미터가 있으면 그리드
const FILTER_KEYS = ["profession", "nationality", "contentType", "contentPresence", "gender", "search", "sortBy", "trendCountry", "page", "pageSize", "tagId", "tier", "reality", "byMin", "byMax"];
export function isGridView(params: Record<string, string | string[] | undefined>): boolean {
  return FILTER_KEYS.some((key) => {
    const v = params[key];
    return typeof v === "string" && v.length > 0;
  });
}

export function parseFilterParams(params: Record<string, string | string[] | undefined>): FiguresFilterParams {
  const notAll = (v?: string) => (v && v !== "all" ? v : undefined);
  const sortByRaw = parseParam(params, "sortBy");
  const sortBy = parseExploreSort(sortByRaw);
  const pageRaw = parseInt(parseParam(params, "page") || "1", 10);
  const page = isNaN(pageRaw) || pageRaw < 1 ? 1 : pageRaw;
  const pageSizeRaw = parseInt(parseParam(params, "pageSize") || "24", 10);
  const pageSize = [12, 24, 48, 96].includes(pageSizeRaw) ? pageSizeRaw : 24;
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
    // 파이프라인 등급 좁히기(full·light). 실존 여부 노출은 realities가 맡는다.
    tiers: parseCelebTiers(parseParam(params, "tier")),
    // 실존 축 필터. 미지정이면 getCelebs가 기본(REAL·BOTH, FICTION 제외)만 노출한다.
    realities: parseCelebRealities(parseParam(params, "reality")),
    profession: notAll(parseParam(params, "profession") || DEFAULT_EXPLORE_PROFESSION),
    nationality: notAll(parseParam(params, "nationality")),
    contentType: notAll(parseParam(params, "contentType")),
    contentPresence: parseCelebContentPresence(parseParam(params, "contentPresence"), DEFAULT_CELEB_CONTENT_PRESENCE),
    gender: notAll(parseParam(params, "gender")),
    search: parseParam(params, "search") || undefined,
    tagId: notAll(parseParam(params, "tagId")),
    birthYearMin: parseYear(parseParam(params, "byMin")),
    birthYearMax: parseYear(parseParam(params, "byMax")),
  };
}

