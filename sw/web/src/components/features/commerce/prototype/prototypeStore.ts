"use client";

import { useSyncExternalStore } from "react";
import { JOURNEY_WORKS, type JourneyId } from "./catalog";
import { isDeveloperMode } from "@/lib/developer-mode";

const KEY = "feelandnote:commerce-prototype:v1";
const CHANGE = "feelandnote:commerce-prototype-change";
let fallback = "";
function subscribe(callback: () => void) {
  window.addEventListener(CHANGE, callback);
  return () => window.removeEventListener(CHANGE, callback);
}
function snapshot() {
  try { return sessionStorage.getItem(KEY) ?? fallback; } catch { return fallback; }
}
export function usePrototypeSaved() {
  const raw = useSyncExternalStore(subscribe, snapshot, () => "");
  const saved = raw.split(",").filter((id): id is JourneyId => Object.hasOwn(JOURNEY_WORKS, id));
  function toggle(id: JourneyId) {
    if (!isDeveloperMode()) return false;
    const current = snapshot().split(",").filter((key): key is JourneyId => Object.hasOwn(JOURNEY_WORKS, key));
    const next = current.includes(id) ? current.filter((key) => key !== id) : [...current, id];
    fallback = next.join(",");
    try { sessionStorage.setItem(KEY, fallback); } catch { /* 이 탭의 메모리에서는 계속 동작한다. */ }
    window.dispatchEvent(new Event(CHANGE));
    return next.includes(id);
  }
  return { saved, toggle };
}
