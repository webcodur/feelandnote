"use client";

import { useEffect, useState } from "react";
import { isReadingTiming, type ReadingTiming } from "@/lib/reading-timing";
import type { Locale } from "@/types/locale";

export function useReadingTiming(id: string, locale: Locale, version: number, text: string, duration: number, available: boolean) {
  const key = `${id}:${locale}:${version}:${text}`;
  const [loaded, setLoaded] = useState<{ key: string; data: ReadingTiming } | null>(null);
  useEffect(() => {
    if (!available || !duration) return;
    const controller = new AbortController();
    let current = true;
    const load = async () => {
      try {
        const response = await fetch(`/api/reading-timing?${new URLSearchParams({ id, locale, v: String(version) })}`, { signal: controller.signal });
        if (!response.ok || response.status === 204) return;
        const data: unknown = await response.json();
        if (!isReadingTiming(data) || Math.abs(data.duration - duration) > 0.15
          || data.segments.some((segment) => segment.textEnd > text.length)) return;
        const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
        const sourceHash = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
        if (sourceHash === data.sourceHash && current) setLoaded({ key, data });
      } catch {
        // Timing is optional; audio remains playable when alignment is unavailable.
      }
    };
    void load();
    return () => { current = false; controller.abort(); };
  }, [id, locale, version, text, duration, available, key]);
  return available && loaded?.key === key ? loaded.data : null;
}
