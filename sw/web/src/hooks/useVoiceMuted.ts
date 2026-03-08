/*
  파일명: hooks/useVoiceMuted.ts
  기능: 대사 음성 전역 뮤트 상태
  책임: localStorage 기반으로 음성 뮤트 여부를 관리한다.
*/
"use client";

import { useState, useCallback, useRef, useEffect } from "react";

const STORAGE_KEY = "fn:voice-muted";

export function useVoiceMuted() {
  const [muted, setMuted] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(STORAGE_KEY) === "1";
  });
  const mutedRef = useRef(muted);

  useEffect(() => { mutedRef.current = muted; }, [muted]);

  const toggle = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      return next;
    });
  }, []);

  return { voiceMuted: muted, voiceMutedRef: mutedRef, toggleVoiceMuted: toggle };
}
