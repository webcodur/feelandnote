import { parseFilterParams } from "@/app/[locale]/(main)/explore/figures/filterParams";
import type { FiguresFilterParams } from "@/app/[locale]/(main)/explore/figures/sections";
import type { CelebCardImage } from "@/components/shared/CelebCard";
import { EXPLORE_FILTER_KEYS, EXPLORE_PREFERENCE_KEYS } from "@/constants/exploreFilters";
import { CELEB_LISTING_LIMITS, normalizeListingParams } from "@/constants/celebListingPolicy";
import { CELEB_FILTER_SELECTION_MAX_LENGTH } from "@/constants/celebFilterSelection";
import { CELEB_REALITIES } from "@feelandnote/shared/constants/celeb-tiers";

export const EXPLORE_PREFERENCES_KEY = "fn:explore-preferences:v1";
export const EXPLORE_FILTER_HISTORY_KEY = "fn:explore-filter-history:v1";
export const EXPLORE_FILTER_HISTORY_ENABLED_KEY = "fn:explore-filter-history-enabled:v1";
export const EXPLORE_FILTER_HISTORY_LIMIT_KEY = "fn:explore-filter-history-limit:v1";
export const EXPLORE_FILTER_HISTORY_LIMITS = { default: 3, min: 1, max: 99 } as const;

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

function normalizeExplorePreferences(raw: unknown): ExplorePreferences | null {
  try {
    if (!raw || typeof raw !== "object" || !("filters" in raw) || !("cardImage" in raw)) return null;
    if (typeof raw.filters !== "string" || (raw.cardImage !== "avatar" && raw.cardImage !== "portrait")) return null;
    const input = new URLSearchParams(raw.filters);
    const params = new URLSearchParams();
    for (const key of EXPLORE_PREFERENCE_KEYS) {
      const value = input.get(key);
      const maxLength = key === "profession" || key === "nationality" ? CELEB_FILTER_SELECTION_MAX_LENGTH : CELEB_LISTING_LIMITS.filterLength;
      if (value !== null && value.length <= maxLength) params.set(key, value);
    }
    const parsed = parseFilterParams(Object.fromEntries(params));
    normalizeListingParams({ ...parsed, limit: parsed.pageSize });
    return createExplorePreferences(parsed, raw.cardImage);
  } catch {
    return null;
  }
}

export function readExplorePreferences(storage: PreferenceStorage): ExplorePreferences | null {
  try {
    return normalizeExplorePreferences(JSON.parse(storage.getItem(EXPLORE_PREFERENCES_KEY) ?? "null"));
  } catch {
    return null;
  }
}

/** 개별 선택값만 빠른 접근에 남긴다. 복수 선택은 항목마다 나누고 생년 범위만 한 쌍으로 둔다. */
export function exploreFilterHistoryEntries(filters: string): string[] {
  const preferences = normalizeExplorePreferences({ filters, cardImage: "avatar" });
  if (!preferences) return [];
  const input = new URLSearchParams(filters);
  const normalized = new URLSearchParams(preferences.filters);
  const entries: string[] = [];
  for (const key of ["profession", "nationality", "contentType", "contentPresence", "gender", "reality"] as const) {
    if (!input.has(key)) continue;
    const value = normalized.get(key);
    if (!value || value === "all") continue;
    if (key === "reality" && CELEB_REALITIES.every(reality => value.split(",").includes(reality))) continue;
    const values = key === "profession" || key === "nationality" ? value.split(",")
      : [key === "reality" ? [...new Set(value.split(","))].sort().join(",") : value];
    for (const selected of values) entries.push(new URLSearchParams({ [key]: selected }).toString());
  }
  const years = new URLSearchParams();
  for (const key of ["byMin", "byMax"]) if (normalized.has(key)) years.set(key, normalized.get(key)!);
  if (years.size) entries.push(years.toString());
  return entries;
}

export function rememberExploreFilters(history: readonly string[], filters: string, previousFilters = "", limit: number = EXPLORE_FILTER_HISTORY_LIMITS.default): string[] {
  const previous = new Set(exploreFilterHistoryEntries(previousFilters));
  const entries = exploreFilterHistoryEntries(filters).filter(entry => !previous.has(entry));
  return [...entries, ...history.filter(item => !entries.includes(item))].slice(0, normalizeExploreFilterHistoryLimit(limit));
}

export function readExploreFilterHistory(storage: PreferenceStorage, limit = readExploreFilterHistoryLimit(storage)): string[] {
  try {
    const raw: unknown = JSON.parse(storage.getItem(EXPLORE_FILTER_HISTORY_KEY) ?? "null");
    if (!Array.isArray(raw)) return [];
    const history: string[] = [];
    for (const item of raw) {
      if (typeof item !== "string") continue;
      for (const entry of exploreFilterHistoryEntries(item)) {
        if (!history.includes(entry)) history.push(entry);
      }
      if (history.length >= normalizeExploreFilterHistoryLimit(limit)) break;
    }
    return history.slice(0, normalizeExploreFilterHistoryLimit(limit));
  } catch {
    return [];
  }
}

export function writeExploreFilterHistory(storage: PreferenceStorage, history: readonly string[], limit = readExploreFilterHistoryLimit(storage)): void {
  try {
    storage.setItem(EXPLORE_FILTER_HISTORY_KEY, JSON.stringify(history.slice(0, normalizeExploreFilterHistoryLimit(limit))));
  } catch {
    // 저장이 막혀 있어도 현재 화면의 내역은 사용할 수 있다.
  }
}

export function normalizeExploreFilterHistoryLimit(value: unknown): number {
  const number = typeof value === "number" ? value : typeof value === "string" && value.trim() ? Number(value) : NaN;
  return Number.isFinite(number)
    ? Math.max(EXPLORE_FILTER_HISTORY_LIMITS.min, Math.min(EXPLORE_FILTER_HISTORY_LIMITS.max, Math.trunc(number)))
    : EXPLORE_FILTER_HISTORY_LIMITS.default;
}

export function readExploreFilterHistoryLimit(storage: PreferenceStorage): number {
  try { return normalizeExploreFilterHistoryLimit(storage.getItem(EXPLORE_FILTER_HISTORY_LIMIT_KEY)); }
  catch { return EXPLORE_FILTER_HISTORY_LIMITS.default; }
}

export function writeExploreFilterHistoryLimit(storage: PreferenceStorage, limit: number): void {
  try { storage.setItem(EXPLORE_FILTER_HISTORY_LIMIT_KEY, String(normalizeExploreFilterHistoryLimit(limit))); }
  catch { /* 저장이 막혀 있어도 현재 화면에서는 선택한 개수를 사용한다. */ }
}

export function readExploreFilterHistoryEnabled(storage: PreferenceStorage): boolean {
  try { return storage.getItem(EXPLORE_FILTER_HISTORY_ENABLED_KEY) !== "false"; }
  catch { return true; }
}

export function writeExploreFilterHistoryEnabled(storage: PreferenceStorage, enabled: boolean): void {
  try { storage.setItem(EXPLORE_FILTER_HISTORY_ENABLED_KEY, String(enabled)); }
  catch { /* 저장을 허용하지 않아도 현재 화면의 사용 여부는 바꿀 수 있다. */ }
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
