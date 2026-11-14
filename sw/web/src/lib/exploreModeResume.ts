import { exploreModeHref, type ExploreMode } from "@/constants/exploreModes";
import { MYTH_LAST_COOKIE } from "@/components/features/user/explore/myth/mythHref";
import type { AtlasWorld } from "@/components/features/user/explore/myth/atlasNavigationData";
import { FACTION_LAST_COOKIE } from "./faction-sections";
import { recentHistoryHref, type RecentHistoryItem } from "./recent-history";

export const ATLAS_CATALOG_PREFERENCES_KEY = "fn-atlas-catalog-preferences-v1";
export interface AtlasCatalogPreferences { section: string | null; query: string }
export type AtlasCatalogPreferenceMap = Partial<Record<AtlasWorld, AtlasCatalogPreferences>>;
export const EMPTY_ATLAS_CATALOG_PREFERENCES: AtlasCatalogPreferences = { section: null, query: "" };

export function parseAtlasCatalogPreferences(raw: string | null): AtlasCatalogPreferenceMap {
  try {
    const parsed: unknown = JSON.parse(raw ?? "{}");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const data = parsed as Partial<Record<AtlasWorld, { section?: unknown; query?: unknown }>>;
    const result: AtlasCatalogPreferenceMap = {};
    for (const mode of ["myth", "faction"] as const) {
      const value = data?.[mode];
      if (value && (value.section === null || typeof value.section === "string") && typeof value.query === "string") {
        result[mode] = { section: value.section || null, query: value.query };
      }
    }
    return result;
  } catch { return {}; }
}

export function exploreModeResumeHref(mode: ExploreMode, history: RecentHistoryItem[], cookies: string, catalog?: AtlasCatalogPreferences): string {
  if (mode === "figures") return exploreModeHref(mode);
  const recent = history.find(item => item.kind === mode && new RegExp(`^/explore/${mode}/[^/?#]+(?:[?#]|$)`).test(item.href));
  if (recent) return recentHistoryHref(recent);
  const key = mode === "myth" ? MYTH_LAST_COOKIE : FACTION_LAST_COOKIE;
  const encoded = cookies.split(/;\s*/).find(item => item.startsWith(`${key}=`))?.slice(key.length + 1);
  try {
    const slug = encoded ? decodeURIComponent(encoded) : "";
    if (slug && !/[/?#\\\s]/u.test(slug)) return `/explore/${mode}/${encodeURIComponent(slug)}`;
  } catch { /* 깨진 쿠키는 목록으로 돌아간다. */ }
  return exploreModeHref(mode, { section: catalog?.section ?? undefined, q: catalog?.query || undefined });
}
