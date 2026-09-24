"use client";

import { useEffect, useState } from "react";
import { isReadingTiming, type ReadingTiming } from "@/lib/reading-timing";
import { getFactionDescVoiceUrl } from "@/lib/game/voice/voiceUrl";
import type { Locale } from "@/types/locale";

export type FactionDescVoice = { timing: ReadingTiming; audioUrl: string };

/** 세력 개요 낭독의 존재 매니페스트는 타이밍 JSON이다. 발행된 음원이 있으면
    검증을 통과한 타이밍과 음원 sha-256으로 버전 붙은 재생 URL을 돌려준다. */
export function useFactionDescVoice(factionId: string | null | undefined, locale: Locale, text: string): FactionDescVoice | null {
  const key = `${factionId}:${locale}:${text}`;
  const [loaded, setLoaded] = useState<{ key: string; voice: FactionDescVoice } | null>(null);

  useEffect(() => {
    if (!factionId || !text) return;
    const controller = new AbortController();
    let current = true;
    const load = async () => {
      try {
        const response = await fetch(`/api/reading-timing?${new URLSearchParams({ id: factionId, locale, v: "0", kind: "faction" })}`, { signal: controller.signal });
        if (!response.ok || response.status === 204) return;
        const data: unknown = await response.json();
        if (!isReadingTiming(data) || data.segments.some((segment) => segment.textEnd > text.length)) return;
        const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
        const sourceHash = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
        if (sourceHash !== data.sourceHash || !current) return;
        setLoaded({ key, voice: { timing: data, audioUrl: getFactionDescVoiceUrl(factionId, locale, data.audioHash) } });
      } catch {
        // 음원이 아직 없거나 타이밍이 어긋나면 재생을 열지 않는다
      }
    };
    void load();
    return () => { current = false; controller.abort(); };
  }, [factionId, locale, text, key]);

  return loaded?.key === key ? loaded.voice : null;
}
