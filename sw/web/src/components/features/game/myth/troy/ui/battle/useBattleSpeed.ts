/*
  파일명: components/features/game/myth/troy/ui/battle/useBattleSpeed.ts
  기능: 트로이 전쟁 싸움 연출 빠르기
  책임: 「빠르게」를 켰는지 브라우저에 기억하고, 켜면 연출(말 움직임·타격·차례 알림·카메라 옮김)을 몇 배로 흘릴지 알려 준다.
        싸움 화면은 사람이 누른 뒤에만 서므로 첫 그림부터 저장값을 읽는다.
*/ // ------------------------------
"use client";

import { useCallback, useState } from "react";

const KEY = "myth-troy:fast";
// 켰을 때 연출이 흐르는 몫(게임이 지은 값)
export const FAST_SCALE = 2.2;

function readFast(): boolean {
  try {
    return typeof window !== "undefined" && window.localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function useBattleSpeed(): { fast: boolean; scale: number; toggle: () => void } {
  const [fast, setFast] = useState(readFast);
  const toggle = useCallback(() => {
    setFast((on) => {
      try {
        window.localStorage.setItem(KEY, on ? "0" : "1");
      } catch {
        // 저장이 막혀도 이번 판에서는 바뀐 값으로 돈다
      }
      return !on;
    });
  }, []);
  return { fast, scale: fast ? FAST_SCALE : 1, toggle };
}
