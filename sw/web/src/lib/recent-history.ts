import { getCelebProfileUrl } from "./url";
import { isDiscardedFaction, retiredFactionHref, retiredFactionTarget } from "./retired-factions";
import { ATLAS_PERSON_PARAM } from "@/components/features/user/explore/myth/atlasNavigationData";

export const RECENT_HISTORY_STORAGE_KEY = "fn-recent-history-v1";
export const RECENT_HISTORY_LIMIT = 10;
export type RecentHistoryKind = "myth" | "faction" | "profile" | "content";

export interface RecentHistoryItem {
  kind: RecentHistoryKind;
  id: string;
  href: string;
  title: string;
  thumbnail: string | null;
  titles?: Record<string, string>;
  subtitle?: string | null;
  subtitles?: Record<string, string>;
  position?: { groupId: string | null; personId: string | null };
  visitedAt: number;
}
export type RecentHistoryVisit = Omit<RecentHistoryItem, "visitedAt">;

export const recentHistoryKey = (item: Pick<RecentHistoryItem, "kind" | "id">) => `${item.kind}:${item.id}`;

/** 도감 카드는 해당 신화·세력으로 돌아가며 저장된 인물 모달을 자동으로 열지 않는다. */
export function recentHistoryHref(item: Pick<RecentHistoryItem, "kind" | "href">): string {
  if (item.kind !== "myth" && item.kind !== "faction") return item.href;
  const url = new URL(item.href, "https://feelandnote.com");
  if (!url.searchParams.has(ATLAS_PERSON_PARAM)) return item.href;
  url.searchParams.delete(ATLAS_PERSON_PARAM);
  return `${url.pathname}${url.search}${url.hash}`;
}

export function forgetRecentHistory(items: RecentHistoryItem[], target: Pick<RecentHistoryItem, "kind" | "id">): RecentHistoryItem[] {
  const key = recentHistoryKey(target);
  return items.filter(item => recentHistoryKey(item) !== key);
}

/** 판본·그룹·언어가 달라도 같은 상세 화면의 현재 항목을 표시한다. */
export function isCurrentRecentHistory(item: RecentHistoryItem, pathname: string, currentId?: string) {
  if (currentId) return item.id === currentId;
  const path = (value: string) => value.split(/[?#]/, 1)[0].replace(/^\/(?:ko|en)(?=\/|$)/, "").replace(/\/$/, "");
  return path(item.href) === path(pathname);
}

/** 다른 종류의 방문이 기존 기록을 밀어내지 않도록 종류마다 한도를 적용한다. */
export function limitRecentHistory(items: RecentHistoryItem[]): RecentHistoryItem[] {
  const counts = new Map<RecentHistoryKind, number>();
  return items.filter(item => {
    const count = counts.get(item.kind) ?? 0;
    if (count >= RECENT_HISTORY_LIMIT) return false;
    counts.set(item.kind, count + 1);
    return true;
  });
}

export function recentHistoryForKind(items: RecentHistoryItem[], kind: RecentHistoryKind): RecentHistoryItem[] {
  return items.filter(item => item.kind === kind);
}

/** 저장된 링크도 내부 상세 주소만 허용한다. 오래되거나 깨진 항목은 건너뛴다. */
export function parseRecentHistory(raw: string | null): RecentHistoryItem[] {
  try {
    const value: unknown = JSON.parse(raw ?? "[]");
    if (!Array.isArray(value)) return [];
    const seen = new Set<string>();
    const valid = value.filter((item): item is RecentHistoryItem => {
      if (!item || !["myth", "faction", "profile", "content"].includes(item.kind)
        || typeof item.id !== "string" || !item.id || typeof item.title !== "string" || !item.title
        || typeof item.href !== "string" || !/^\/(?:explore\/(?:myth|faction)(?:\/|\?|$)|celeb\/|content\/|[0-9a-f-]{36}(?:[?#]|$))[^\\]*$/i.test(item.href)
        || !(item.thumbnail === null || typeof item.thumbnail === "string")
        || typeof item.visitedAt !== "number" || !Number.isFinite(item.visitedAt)) return false;
      if (item.titles && (typeof item.titles !== "object" || Object.values(item.titles).some(title => typeof title !== "string"))) return false;
      if (item.subtitles && (typeof item.subtitles !== "object" || Object.values(item.subtitles).some(title => typeof title !== "string"))) return false;
      if (!(item.subtitle === undefined || item.subtitle === null || typeof item.subtitle === "string")) return false;
      if (item.position && (!(item.position.groupId === null || typeof item.position.groupId === "string")
        || !(item.position.personId === null || typeof item.position.personId === "string"))) return false;
      const key = recentHistoryKey(item);
      if (item.kind === 'faction') {
        const url = new URL(item.href, 'https://feelandnote.com');
        const reference = url.pathname.split('/').pop() ?? '';
        if (isDiscardedFaction(item.id) || isDiscardedFaction(reference)
          || isDiscardedFaction(url.searchParams.get('faction') ?? url.searchParams.get('tag') ?? '')) return false;
      }
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    const migrated = valid.map(item => {
      if (item.kind !== 'faction') return item;
      const url = new URL(item.href, 'https://feelandnote.com');
      const target = retiredFactionTarget(item.id)
        ?? retiredFactionTarget(url.pathname.split('/').pop() ?? '')
        ?? retiredFactionTarget(url.searchParams.get('faction') ?? url.searchParams.get('tag') ?? '');
      const href = retiredFactionHref(url.pathname, url.searchParams);
      if (!target || !href) return item;
      return {
        ...item, id: target.id, href: href + url.hash,
        title: target.name, titles: { ko: target.name, en: target.nameEn },
        subtitle: target.group, subtitles: { ko: target.group, en: target.groupEn },
        position: { groupId: target.group, personId: item.position?.personId ?? url.searchParams.get('person') },
      };
    });
    const canonicalKeys = new Set<string>();
    return limitRecentHistory(migrated.filter(item => {
      const key = recentHistoryKey(item);
      if (canonicalKeys.has(key)) return false;
      canonicalKeys.add(key);
      return true;
    }));
  } catch { return []; }
}

export function rememberRecentHistory(items: RecentHistoryItem[], visit: RecentHistoryVisit, visitedAt = Date.now()): RecentHistoryItem[] {
  const key = recentHistoryKey(visit);
  const previous = items.find(item => recentHistoryKey(item) === key);
  return limitRecentHistory([{ ...previous, ...visit, titles: { ...previous?.titles, ...visit.titles },
    subtitles: visit.position?.groupId !== previous?.position?.groupId ? visit.subtitles : { ...previous?.subtitles, ...visit.subtitles },
    visitedAt }, ...items.filter(item => recentHistoryKey(item) !== key)]);
}

/** 기존 인물·작품 기록을 종류를 유지한 채 가져온다. */
export function legacyRecentHistory(profilesRaw: string | null, contentsRaw: string | null): RecentHistoryItem[] {
  const rows: unknown[] = [];
  try {
    const profiles = JSON.parse(profilesRaw ?? "[]");
    if (Array.isArray(profiles)) for (const p of profiles) {
      if (!p || typeof p.id !== "string" || typeof p.nickname !== "string") continue;
      rows.push({ kind: "profile", id: p.id, href: p.profileType === "CELEB" ? getCelebProfileUrl(p) : `/${encodeURIComponent(p.id)}`,
        title: p.nickname, titles: { ...(p.nickname_ko ? { ko: p.nickname_ko } : {}), ...(p.nickname_en ? { en: p.nickname_en } : {}) },
        thumbnail: p.avatarUrl ?? null, visitedAt: p.visitedAt });
    }
  } catch { /* 한 저장소가 깨져도 다른 기록은 읽는다. */ }
  try {
    const contents = JSON.parse(contentsRaw ?? "[]");
    if (Array.isArray(contents)) for (const c of contents) {
      if (!c || typeof c.id !== "string") continue;
      rows.push({ kind: "content", id: c.id, href: `/content/${encodeURIComponent(c.id)}`,
        title: c.title, thumbnail: c.thumbnail ?? null, visitedAt: c.visitedAt });
    }
  } catch { /* 비정상 옛 작품 기록 */ }
  rows.sort((a, b) => (b as RecentHistoryItem).visitedAt - (a as RecentHistoryItem).visitedAt);
  return parseRecentHistory(JSON.stringify(rows));
}
