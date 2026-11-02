"use client";

import { useCallback, useEffect, useEffectEvent, useRef, useState } from "react";
import {
  canRestoreExploreFilters, readExplorePreferences, writeExplorePreferences,
  exploreFilterHistoryEntries, readExploreFilterHistory, rememberExploreFilters, writeExploreFilterHistory,
  readExploreFilterHistoryEnabled, writeExploreFilterHistoryEnabled,
  EXPLORE_FILTER_HISTORY_LIMITS, normalizeExploreFilterHistoryLimit, readExploreFilterHistoryLimit, writeExploreFilterHistoryLimit,
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
  const [recentFiltersEnabled, setRecentFiltersEnabled] = useState(true);
  const [recentFiltersLimit, setRecentFiltersLimit] = useState<number>(EXPLORE_FILTER_HISTORY_LIMITS.default);
  const saveHistory = useCallback((next: string[], limit = recentFiltersLimit) => {
    const trimmed = next.slice(0, limit);
    setRecentFilters(trimmed);
    try { writeExploreFilterHistory(window.localStorage, trimmed, limit); } catch { /* 저장 접근이 막힌 브라우저 */ }
  }, [recentFiltersLimit]);
  const restore = useEffectEvent(() => {
    try {
      const limit = readExploreFilterHistoryLimit(window.localStorage);
      const history = readExploreFilterHistory(window.localStorage, limit);
      setRecentFiltersLimit(limit);
      setRecentFilters(history);
      writeExploreFilterHistory(window.localStorage, history, limit);
      setRecentFiltersEnabled(readExploreFilterHistoryEnabled(window.localStorage));
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
    if (previous !== null && recentFiltersEnabled) saveHistory(rememberExploreFilters(recentFilters, filters, previous, recentFiltersLimit));
  });
  useEffect(() => {
    if (!enabled || !ready) return;
    let active = true;
    queueMicrotask(() => { if (active) remember(); });
    return () => { active = false; };
  }, [enabled, ready, filters, recentFiltersEnabled]);

  return {
    recentFilters,
    recentFiltersEnabled,
    recentFiltersReady: ready,
    recentFiltersLimit,
    handleRecentFiltersLimitChange: (value: number) => {
      const limit = normalizeExploreFilterHistoryLimit(value);
      previousFilters.current = filters;
      setRecentFiltersLimit(limit);
      saveHistory(recentFilters, limit);
      try { writeExploreFilterHistoryLimit(window.localStorage, limit); } catch { /* 저장 접근이 막힌 브라우저 */ }
    },
    currentFilterEntries: exploreFilterHistoryEntries(filters),
    removeRecentFilter: (entry: string) => saveHistory(recentFilters.filter(item => item !== entry)),
    clearRecentFilters: () => { previousFilters.current = filters; saveHistory([]); },
    handleRecentFiltersEnabledChange: (next: boolean) => {
      previousFilters.current = filters;
      setRecentFiltersEnabled(next);
      try { writeExploreFilterHistoryEnabled(window.localStorage, next); } catch { /* 저장 접근이 막힌 브라우저 */ }
    },
  };
}
