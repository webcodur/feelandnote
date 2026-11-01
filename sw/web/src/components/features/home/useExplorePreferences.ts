"use client";

import { useCallback, useEffect, useEffectEvent, useRef, useState } from "react";
import {
  canRestoreExploreFilters, readExplorePreferences, writeExplorePreferences,
  exploreFilterHistoryEntries, readExploreFilterHistory, rememberExploreFilters, writeExploreFilterHistory,
  type ExplorePreferences,
} from "@/lib/explorePreferences";

export function useExplorePreferences(
  enabled: boolean,
  preferences: ExplorePreferences,
  onRestore: (saved: ExplorePreferences, restoreFilters: boolean) => void,
) {
  const [ready, setReady] = useState(false);
  const previousFilters = useRef<string | null>(null);
  const [recentFilters, setRecentFilters] = useState<string[]>([]);
  const saveHistory = useCallback((next: string[]) => {
    setRecentFilters(next);
    try { writeExploreFilterHistory(window.localStorage, next); } catch { /* 저장 접근이 막힌 브라우저 */ }
  }, []);
  const restore = useEffectEvent(() => {
    try {
      setRecentFilters(readExploreFilterHistory(window.localStorage));
      const saved = readExplorePreferences(window.localStorage);
      if (saved) onRestore(saved, canRestoreExploreFilters(window.location.search) && saved.filters !== preferences.filters);
    } catch {
      // 브라우저가 localStorage 접근 자체를 막은 경우 기본값을 쓴다.
    }
    setReady(true);
  });

  useEffect(() => {
    if (!enabled) return;
    // hydration을 마친 뒤 복원하며 StrictMode에서 취소된 마운트는 건너뛴다.
    let active = true;
    queueMicrotask(() => { if (active) restore(); });
    return () => { active = false; };
  }, [enabled]);

  const { filters, cardImage } = preferences;
  useEffect(() => {
    if (!enabled || !ready) return;
    try {
      writeExplorePreferences(window.localStorage, { filters, cardImage });
    } catch {
      // 저장을 허용하지 않는 브라우저에서도 탐색은 동작한다.
    }
  }, [enabled, ready, filters, cardImage]);

  const remember = useEffectEvent(() => {
    const previous = previousFilters.current;
    previousFilters.current = filters;
    if (previous !== null) saveHistory(rememberExploreFilters(recentFilters, filters, previous));
  });
  useEffect(() => {
    if (!enabled || !ready) return;
    let active = true;
    queueMicrotask(() => { if (active) remember(); });
    return () => { active = false; };
  }, [enabled, ready, filters]);

  return {
    recentFilters,
    currentFilterEntries: exploreFilterHistoryEntries(filters),
    removeRecentFilter: (entry: string) => saveHistory(recentFilters.filter(item => item !== entry)),
  };
}
