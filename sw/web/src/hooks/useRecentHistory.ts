"use client";

import { useEffect, useEffectEvent, useRef, useSyncExternalStore } from "react";
import { forgetRecentHistory, legacyRecentHistory, limitRecentHistory, parseRecentHistory, recentHistoryForKind, recentHistoryKey, rememberRecentHistory,
  RECENT_HISTORY_STORAGE_KEY, type RecentHistoryItem, type RecentHistoryKind, type RecentHistoryVisit } from "@/lib/recent-history";
import { parseRecentAtlas, RECENT_ATLAS_STORAGE_KEYS } from "@/lib/recent-atlas";

const empty: RecentHistoryItem[] = [];
let snapshot: RecentHistoryItem[] | undefined;
const listeners = new Set<() => void>();

function readStorage(): RecentHistoryItem[] {
  try {
    const raw = localStorage.getItem(RECENT_HISTORY_STORAGE_KEY);
    return raw === null ? snapshot ?? legacyRecentHistory(localStorage.getItem("recent_profiles_v2"), localStorage.getItem("recent_contents")) : parseRecentHistory(raw);
  } catch { return snapshot ?? empty; }
}

export function getRecentHistory(): RecentHistoryItem[] {
  return snapshot ??= readStorage();
}

function save(items: RecentHistoryItem[]) {
  snapshot = items;
  try { localStorage.setItem(RECENT_HISTORY_STORAGE_KEY, JSON.stringify(items)); } catch { /* 저장이 막히면 현재 세션에만 남긴다. */ }
  listeners.forEach(listener => listener());
}

export function recordRecentHistory(visit: RecentHistoryVisit) {
  save(rememberRecentHistory(readStorage(), visit));
}

export function removeRecentHistory(target: Pick<RecentHistoryItem, "kind" | "id">) {
  // 이전 도감 저장소에서도 빼야 다음 화면의 마이그레이션이 삭제한 항목을 복원하지 않는다.
  if (target.kind === "myth" || target.kind === "faction") {
    try {
      const key = RECENT_ATLAS_STORAGE_KEYS[target.kind];
      const raw = localStorage.getItem(key);
      if (raw !== null) localStorage.setItem(key, JSON.stringify(parseRecentAtlas(raw).filter(item => item.entryId !== target.id)));
    } catch { /* 저장이 막히면 현재 세션에서만 삭제한다. */ }
  }
  save(forgetRecentHistory(readStorage(), target));
}

export function seedRecentHistory(items: RecentHistoryVisit[]) {
  const current = readStorage();
  const keys = new Set(current.map(recentHistoryKey));
  const missing = items.filter(item => !keys.has(recentHistoryKey(item)));
  if (missing.length) save(limitRecentHistory([...current, ...missing.map(item => ({ ...item, visitedAt: 0 }))]));
}

/** 공개 목록의 이름·주소를 갱신하되 최근 조회 순서와 이어 읽을 자리는 유지한다. */
export function refreshRecentHistory(kind: RecentHistoryKind, resolve: (item: RecentHistoryItem) => RecentHistoryVisit | null) {
  const current = getRecentHistory();
  const next = current.flatMap(item => {
    if (item.kind !== kind) return [item];
    const visit = resolve(item);
    return visit ? [{ ...item, ...visit, titles: { ...item.titles, ...visit.titles },
      subtitles: visit.position?.groupId === item.position?.groupId ? { ...item.subtitles, ...visit.subtitles } : visit.subtitles }] : [];
  });
  if (JSON.stringify(current) !== JSON.stringify(next)) save(next);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const sync = (event: StorageEvent) => {
    if (event.key === RECENT_HISTORY_STORAGE_KEY || event.key === null) {
      snapshot = undefined;
      snapshot = readStorage();
      listener();
    }
  };
  window.addEventListener("storage", sync);
  return () => { listeners.delete(listener); window.removeEventListener("storage", sync); };
}

/** 저장·표시는 재사용하되 화면에서는 요청한 종류의 기록만 반환한다. */
export function useRecordRecentHistory(visit: RecentHistoryVisit | null) {
  const lastRecorded = useRef<string | null>(null);
  const visitKey = JSON.stringify(visit ?? null);
  const record = useEffectEvent(() => {
    if (!visit) { lastRecorded.current = null; return; }
    const key = recentHistoryKey(visit);
    const sameVisit = lastRecorded.current === key;
    lastRecorded.current = key;
    // 현재 항목을 지운 뒤 표지·번역이 늦게 도착해도 새 방문으로 다시 넣지 않는다.
    if (sameVisit && !getRecentHistory().some(item => recentHistoryKey(item) === key)) return;
    recordRecentHistory(visit);
  });
  useEffect(() => { record(); }, [visitKey]);
}

export function useRecentHistory(visit: RecentHistoryVisit | null, kind: RecentHistoryKind = visit?.kind ?? "profile") {
  const items = useSyncExternalStore(subscribe, getRecentHistory, () => empty);
  useRecordRecentHistory(visit);
  return recentHistoryForKind(items, kind);
}
