/*
  파일명: components/features/game/myth/shared/useBestScore.ts
  기능: 신화 게임 최고 기록
  책임: 게임별 최고 점수를 이 브라우저에만 남긴다. 서버에는 아무것도 쓰지 않는다.
*/ // ------------------------------
"use client";

import { useCallback, useSyncExternalStore } from "react";

const CHANGE_EVENT = "myth-game-best-change";

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

function read(storageKey: string): number {
  const value = Number(window.localStorage.getItem(storageKey));
  return Number.isFinite(value) && value > 0 ? value : 0;
}

// higherIsBetter=false면 적을수록 좋은 기록(이동 수·질문 수)이다
export function useBestScore(key: string, higherIsBetter = true) {
  const storageKey = `feelandnote:myth-game:${key}`;
  const best = useSyncExternalStore(subscribe, () => read(storageKey), () => 0);
  const submit = useCallback((score: number): boolean => {
    const previous = read(storageKey);
    const better = previous === 0 || (higherIsBetter ? score > previous : score < previous);
    if (!better || score <= 0) return false;
    window.localStorage.setItem(storageKey, String(score));
    window.dispatchEvent(new Event(CHANGE_EVENT));
    return true;
  }, [storageKey, higherIsBetter]);
  return { best, submit };
}
