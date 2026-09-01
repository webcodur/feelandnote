"use client";

import { useCallback, useLayoutEffect, useRef } from "react";

interface Anchor {
  element: HTMLElement;
  top: number;
}

export default function useViewportAnchor() {
  const pendingRef = useRef<Anchor | null>(null);

  const capture = useCallback((element: HTMLElement | null) => {
    pendingRef.current = element ? { element, top: element.getBoundingClientRect().top } : null;
  }, []);

  useLayoutEffect(() => {
    const anchor = pendingRef.current;
    if (!anchor) return;
    pendingRef.current = null;
    if (!anchor.element.isConnected) return;
    const delta = anchor.element.getBoundingClientRect().top - anchor.top;
    if (Math.abs(delta) > 0.5) window.scrollBy({ top: delta, behavior: "instant" });
  });

  return capture;
}
