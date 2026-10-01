/*
  파일명: components/features/game/hegemony/hooks/useHegemonySettings.ts
  기능: 패권 개인 설정
  책임: 연출 속도처럼 이 브라우저에만 두는 설정을 저장하고 읽는다. 소리 켜기·끄기는 공용 오디오 훅이 쥔다.
*/
"use client";

import { useCallback, useSyncExternalStore } from "react";

export type AnimationSpeed = "normal" | "fast";

const KEY = "feelandnote:hegemony:speed";
const listeners = new Set<() => void>();

function read(): AnimationSpeed {
  return window.localStorage.getItem(KEY) === "fast" ? "fast" : "normal";
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

/** 연출 시간 배율 — 빠르게는 절반 */
export const SPEED_SCALE: Record<AnimationSpeed, number> = { normal: 1, fast: 0.5 };

export function useHegemonySettings() {
  const speed = useSyncExternalStore(subscribe, read, (): AnimationSpeed => "normal");
  const setSpeed = useCallback((next: AnimationSpeed) => {
    window.localStorage.setItem(KEY, next);
    listeners.forEach((l) => l());
  }, []);
  return { speed, setSpeed, scale: SPEED_SCALE[speed] };
}
