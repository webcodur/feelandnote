"use client";

import { useSyncExternalStore } from "react";
import type { AtlasWorld } from "@/components/features/user/explore/myth/atlasNavigationData";
import { ATLAS_CATALOG_PREFERENCES_KEY, EMPTY_ATLAS_CATALOG_PREFERENCES, parseAtlasCatalogPreferences,
  type AtlasCatalogPreferences, type AtlasCatalogPreferenceMap } from "@/lib/exploreModeResume";

const empty: AtlasCatalogPreferenceMap = {};
let snapshot: AtlasCatalogPreferenceMap = empty;
let previousRaw: string | null | undefined;
let storageAvailable = true;
const listeners = new Set<() => void>();

function read() {
  try {
    const raw = storageAvailable ? localStorage.getItem(ATLAS_CATALOG_PREFERENCES_KEY) : previousRaw;
    if (raw !== previousRaw) {
      previousRaw = raw;
      snapshot = parseAtlasCatalogPreferences(raw ?? null);
    }
  } catch { storageAvailable = false; }
  return snapshot;
}

export function rememberAtlasCatalogPreferences(mode: AtlasWorld, value: AtlasCatalogPreferences) {
  const current = read();
  if (current[mode]?.section === value.section && current[mode]?.query === value.query) return;
  snapshot = { ...current, [mode]: value };
  previousRaw = JSON.stringify(snapshot);
  try { if (storageAvailable) localStorage.setItem(ATLAS_CATALOG_PREFERENCES_KEY, previousRaw); }
  catch { storageAvailable = false; }
  listeners.forEach(listener => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const sync = (event: StorageEvent) => {
    if (event.key === ATLAS_CATALOG_PREFERENCES_KEY || event.key === null) { previousRaw = undefined; listener(); }
  };
  window.addEventListener("storage", sync);
  return () => { listeners.delete(listener); window.removeEventListener("storage", sync); };
}

export function useAtlasCatalogPreferences(mode: AtlasWorld) {
  const preferences = useSyncExternalStore(subscribe, read, () => empty);
  return preferences[mode] ?? EMPTY_ATLAS_CATALOG_PREFERENCES;
}
