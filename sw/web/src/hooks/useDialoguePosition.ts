/*
  파일명: hooks/useDialoguePosition.ts
  기능: 대사 자막 위치 설정
  책임: localStorage 기반으로 대사 자막 표시 좌표(top%, left%)를 관리한다.
*/
"use client";

import { useState, useCallback, useEffect } from "react";

export interface DialogueCoords {
  /** 화면 상단 기준 퍼센트 (0~100) */
  top: number;
  /** 화면 좌측 기준 퍼센트 (0~100) */
  left: number;
}

const STORAGE_KEY = "fn:dialogue-pos";
export const DEFAULT_DIALOGUE_COORDS: DialogueCoords = { top: 92, left: 50 };

export function useDialoguePosition() {
  // SSR과 동일한 기본값으로 초기화 → hydration 불일치 방지
  const [coords, setCoords] = useState<DialogueCoords>(DEFAULT_DIALOGUE_COORDS);

  // 마운트 후 localStorage에서 복원
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (typeof parsed.top === "number" && typeof parsed.left === "number") {
        setCoords(parsed);
      }
    } catch {}
  }, []);

  const saveCoords = useCallback((c: DialogueCoords) => {
    const clamped = {
      top: Math.max(5, Math.min(95, c.top)),
      left: Math.max(10, Math.min(90, c.left)),
    };
    setCoords(clamped);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(clamped));
  }, []);

  return { coords, saveCoords };
}
