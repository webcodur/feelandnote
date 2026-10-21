import { parseFilterParams } from "@/app/[locale]/(main)/explore/figures/filterParams";
import type { FiguresFilterParams } from "@/app/[locale]/(main)/explore/figures/sections";
import type { CelebCardImage } from "@/components/shared/CelebCard";
import { EXPLORE_FILTER_KEYS, EXPLORE_PREFERENCE_KEYS } from "@/constants/exploreFilters";
import { CELEB_LISTING_LIMITS, normalizeListingParams } from "@/constants/celebListingPolicy";

export const EXPLORE_PREFERENCES_KEY = "fn:explore-preferences:v1";

export interface ExplorePreferences {
  filters: string;
  cardImage: CelebCardImage;
}

type PreferenceStorage = Pick<Storage, "getItem" | "setItem">;

export function createExplorePreferences(filters: Omit<FiguresFilterParams, "page">, cardImage: CelebCardImage): ExplorePreferences {
  const params = new URLSearchParams({
    profession: filters.profession ?? "all", nationality: filters.nationality ?? "all",
    contentType: filters.contentType ?? "all", contentPresence: filters.contentPresence ?? "all",
    gender: filters.gender ?? "all", sortBy: filters.sortBy, pageSize: String(filters.pageSize),
  });
  if (filters.trendCountry) params.set("trendCountry", filters.trendCountry);
  if (filters.realities?.length) params.set("reality", filters.realities.join(","));
  if (filters.birthYearMin !== undefined) params.set("byMin", String(filters.birthYearMin));
  if (filters.birthYearMax !== undefined) params.set("byMax", String(filters.birthYearMax));
  return { filters: params.toString(), cardImage };
}

export function readExplorePreferences(storage: PreferenceStorage): ExplorePreferences | null {
  try {
    const raw: unknown = JSON.parse(storage.getItem(EXPLORE_PREFERENCES_KEY) ?? "null");
    if (!raw || typeof raw !== "object" || !("filters" in raw) || !("cardImage" in raw)) return null;
    if (typeof raw.filters !== "string" || (raw.cardImage !== "avatar" && raw.cardImage !== "portrait")) return null;
    const input = new URLSearchParams(raw.filters);
    const params = new URLSearchParams();
    for (const key of EXPLORE_PREFERENCE_KEYS) {
      const value = input.get(key);
      if (value !== null && value.length <= CELEB_LISTING_LIMITS.filterLength) params.set(key, value);
    }
    const parsed = parseFilterParams(Object.fromEntries(params));
    normalizeListingParams({ ...parsed, limit: parsed.pageSize });
    return createExplorePreferences(parsed, raw.cardImage);
  } catch {
    return null;
  }
}

export function writeExplorePreferences(storage: PreferenceStorage, preferences: ExplorePreferences): void {
  try {
    storage.setItem(EXPLORE_PREFERENCES_KEY, JSON.stringify(preferences));
  } catch {
    // 저장 공간이 막혀 있어도 현재 화면의 선택은 계속 사용할 수 있다.
  }
}

export function canRestoreExploreFilters(query: string): boolean {
  const params = new URLSearchParams(query);
  return !EXPLORE_FILTER_KEYS.some(key => params.has(key));
}

export function restoreExplorePreferenceUrl(query: string, saved: string): string {
  const params = new URLSearchParams(query);
  const preferences = new URLSearchParams(saved);
  for (const key of EXPLORE_PREFERENCE_KEYS) {
    const value = preferences.get(key);
    if (value === null) params.delete(key);
    else params.set(key, value);
  }
  return params.toString();
}
