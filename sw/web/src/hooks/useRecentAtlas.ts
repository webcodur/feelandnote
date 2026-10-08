"use client";

import { useEffect, useEffectEvent, useRef } from "react";
import { useLocale } from "next-intl";
import type { AtlasTheme, AtlasWorld } from "@/components/features/user/explore/myth/atlasNavigationData";
import { parseRecentAtlas, rememberAtlas, recentAtlasHref, RECENT_ATLAS_STORAGE_KEYS } from "@/lib/recent-atlas";
import { getRecentHistory, recordRecentHistory, seedRecentHistory, useRecentHistory } from "./useRecentHistory";
import type { RecentHistoryVisit } from "@/lib/recent-history";

export function useRecentAtlas(world: AtlasWorld, entryId: string | null, groupId: string | null, personId: string | null, tree: AtlasTheme[]) {
  const items = useRecentHistory(null, world);
  const locale = useLocale();
  const storageKey = RECENT_ATLAS_STORAGE_KEYS[world];
  const lastEntry = useRef<string | null>(null);
  const lastVisit = useRef<string | null>(null);
  const entries = tree.flatMap(theme => theme.entries).filter(entry => !entry.disabled && entry.href);
  const entry = entries.find(entry => entry.id === entryId);
  const toVisit = (id: string, group: string | null, person: string | null): RecentHistoryVisit | null => {
    const entry = entries.find(entry => entry.id === id);
    if (!entry?.href) return null;
    const selectedGroup = entry.groups.find(item => item.id === group);
    const position = { groupId: selectedGroup?.id ?? null, personId: group && !selectedGroup ? null : person };
    return { kind: world, id, href: recentAtlasHref(entry.href, position.groupId, position.personId),
      title: entry.name, titles: { [locale]: entry.name }, thumbnail: entry.imageUrl ?? null,
      subtitle: selectedGroup?.name ?? null, subtitles: { [locale]: selectedGroup?.name ?? "" }, position };
  };
  const migrate = useEffectEvent(() => {
    try {
      seedRecentHistory(parseRecentAtlas(localStorage.getItem(storageKey)).flatMap(item => {
        const visit = toVisit(item.entryId, item.groupId, item.personId);
        return visit ? [visit] : [];
      }));
    } catch { /* 비공개 브라우징 */ }
  });
  useEffect(() => { migrate(); }, [storageKey]);
  const recordVisit = useEffectEvent(() => {
    const effectKey = JSON.stringify([world, entryId, groupId, personId, locale, entry?.name, entry?.imageUrl]);
    if (effectKey === lastVisit.current) return;
    lastVisit.current = effectKey;
    const previous = getRecentHistory().filter(item => item.kind === world).map(item => ({
      entryId: item.id, groupId: item.position?.groupId ?? null, personId: item.position?.personId ?? null,
    }));
    // 허브가 기본 「전체 구성원」으로 열려도 최근 목록의 이어 읽을 자리는 보존한다.
    // 같은 항목에서 사용자가 그룹을 바꾸는 동작은 새 선택으로 기억한다.
    const visitKey = `${world}:${entryId}`;
    const preservePosition = lastEntry.current !== visitKey && groupId === null && personId === null;
    const next = entryId ? rememberAtlas(previous, { entryId, groupId, personId }, preservePosition)[0] : null;
    lastEntry.current = visitKey;
    if (next) {
      const visit = toVisit(next.entryId, next.groupId, next.personId);
      if (visit) recordRecentHistory(visit);
    }
  });
  useEffect(() => { recordVisit(); }, [world, entryId, groupId, personId, locale, entry?.name, entry?.imageUrl]);
  // 도감 이름·표지는 지금 공개된 목록에서 읽어 언어 변경과 비공개 전환도 따른다.
  return items.flatMap(item => {
    const current = toVisit(item.id, item.position?.groupId ?? null, item.position?.personId ?? null);
    return current ? [{ ...item, ...current, titles: { ...item.titles, ...current.titles } }] : [];
  });
}
