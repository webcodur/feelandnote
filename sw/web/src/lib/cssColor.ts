"use client";

import { useEffect, useRef, type RefObject } from "react";
import { subscribeTheme } from "@/lib/theme";

export type Rgb = readonly [number, number, number];

/**
 * CSS 변수를 브라우저가 고른 실제 색으로 받는다. 토큰은 light-dark()로 적혀 있어
 * 변수 문자열 그대로는 캔버스가 못 읽는다 — 그 자리에 임시 글자를 붙여 계산된 색을 읽는다.
 */
export function readCssColor(scope: HTMLElement, name: string, fallback = "#000"): string {
  const probe = document.createElement("span");
  probe.style.color = `var(${name}, ${fallback})`;
  scope.appendChild(probe);
  const color = getComputedStyle(probe).color;
  probe.remove();
  return color || fallback;
}

export function readCssRgb(scope: HTMLElement, name: string): Rgb {
  const [r = 0, g = 0, b = 0] = (readCssColor(scope, name).match(/[\d.]+/g) ?? []).map(Number);
  return [r, g, b];
}

export const rgba = ([r, g, b]: Rgb, alpha: number) => `rgba(${r}, ${g}, ${b}, ${alpha})`;

/** 캔버스가 매 프레임 읽을 색 묶음. 테마가 바뀌면 다시 읽는다. */
export function useCssRgb<K extends string>(scopeRef: RefObject<HTMLElement | null>, names: Record<K, string>) {
  const colors = useRef({} as Record<K, Rgb>);
  useEffect(() => {
    const read = () => {
      const scope = scopeRef.current;
      if (!scope) return;
      for (const key of Object.keys(names) as K[]) colors.current[key] = readCssRgb(scope, names[key]);
    };
    read();
    return subscribeTheme(read);
    // names는 모듈 상수로 넘긴다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopeRef]);
  return colors;
}
