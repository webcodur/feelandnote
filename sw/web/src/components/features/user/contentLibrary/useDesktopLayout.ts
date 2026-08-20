"use client";

import { useSyncExternalStore } from "react";

export const DESKTOP_LAYOUT_QUERY = "(min-width: 768px)";

function subscribe(onChange: () => void) {
  const mediaQuery = window.matchMedia(DESKTOP_LAYOUT_QUERY);
  mediaQuery.addEventListener("change", onChange);
  return () => mediaQuery.removeEventListener("change", onChange);
}

const getSnapshot = () => window.matchMedia(DESKTOP_LAYOUT_QUERY).matches;
const getServerSnapshot = () => null;

/** Tailwind의 md 경계와 같은 넓은 화면 판정. 서버·첫 hydration은 아직 모르는 상태(null)다. */
export function useDesktopLayout() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
