import { ATLAS_GROUP_PARAM, ATLAS_PERSON_PARAM, type AtlasWorld } from "@/components/features/user/explore/myth/atlasNavigationData";

export const RECENT_ATLAS_STORAGE_KEYS: Record<AtlasWorld, string> = {
  myth: "fn-recent-myths-v1",
  faction: "fn-recent-factions-v1",
};
const MAX_ITEMS = 8;

export interface RecentAtlasItem {
  entryId: string;
  groupId: string | null;
  personId: string | null;
}

/** 이름·표지는 현재 공개 목록에서 읽는다. 저장된 임의 주소로 이동하지 않는다. */
export function parseRecentAtlas(raw: string | null): RecentAtlasItem[] {
  try {
    const parsed: unknown = JSON.parse(raw ?? "[]");
    if (!Array.isArray(parsed)) return [];
    const seen = new Set<string>();
    return parsed.filter((item): item is RecentAtlasItem => {
      if (!item || typeof item.entryId !== "string" || !item.entryId || seen.has(item.entryId)
        || !(item.groupId === null || typeof item.groupId === "string")
        || !(item.personId === null || typeof item.personId === "string")) return false;
      seen.add(item.entryId);
      return true;
    }).slice(0, MAX_ITEMS);
  } catch { return []; }
}

export function rememberAtlas(items: RecentAtlasItem[], current: RecentAtlasItem, preservePosition = false): RecentAtlasItem[] {
  const previous = items.find((item) => item.entryId === current.entryId);
  if (preservePosition && previous) {
    return [previous, ...items.filter((item) => item.entryId !== current.entryId)].slice(0, MAX_ITEMS);
  }
  // 소개 모달을 닫아도 마지막으로 읽은 인물을 잃지 않는다. 그룹을 바꾸면 그 인물은 초기화한다.
  const personId = current.personId ?? (previous?.groupId === current.groupId ? previous.personId : null);
  return [{ ...current, personId }, ...items.filter((item) => item.entryId !== current.entryId)].slice(0, MAX_ITEMS);
}

export function recentAtlasHref(href: string, groupId: string | null, personId: string | null): string {
  const query = new URLSearchParams();
  if (groupId) query.set(ATLAS_GROUP_PARAM, groupId);
  if (personId) query.set(ATLAS_PERSON_PARAM, personId);
  return `${href}${query.size ? `?${query}` : ""}`;
}
