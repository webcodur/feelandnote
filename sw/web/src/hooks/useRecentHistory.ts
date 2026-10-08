"use client";

import { useEffect, useEffectEvent, useSyncExternalStore } from "react";
import { legacyRecentHistory, limitRecentHistory, parseRecentHistory, recentHistoryForKind, recentHistoryKey, rememberRecentHistory,
  RECENT_HISTORY_STORAGE_KEY, type RecentHistoryItem, type RecentHistoryKind, type RecentHistoryVisit } from "@/lib/recent-history";

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

export function seedRecentHistory(items: RecentHistoryVisit[]) {
  const current = readStorage();
  const keys = new Set(current.map(recentHistoryKey));
  const missing = items.filter(item => !keys.has(recentHistoryKey(item)));
  if (missing.length) save(limitRecentHistory([...current, ...missing.map(item => ({ ...item, visitedAt: 0 }))]));
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
export function useRecentHistory(visit: RecentHistoryVisit | null, kind: RecentHistoryKind = visit?.kind ?? "profile") {
  const items = useSyncExternalStore(subscribe, getRecentHistory, () => empty);
  const visitKey = JSON.stringify(visit ?? null);
  const record = useEffectEvent(() => { if (visit) recordRecentHistory(visit); });
  useEffect(() => { record(); }, [visitKey]);
  return recentHistoryForKind(items, kind);
}
