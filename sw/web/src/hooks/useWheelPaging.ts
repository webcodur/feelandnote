"use client";

import { useEffect, useRef, type RefObject } from "react";

/* 휠·트랙패드 스크롤을 좌우 페이지 넘기기로 쓴다 — 장면 뷰어·전체화면 공통.
   휠 한 틱이 임계(80px, 노치 100~120보다 조금 아래)를 넘을 때마다 한 장 넘긴다 — 쓰로틀 없이
   스크롤 횟수와 장면 수가 일치하게. 연속 스트림이 멈추면 누적을 비워 다음 제스처를 새로 센다.
   [data-wheel-pass] 안의 휠은 그대로 둔다 — 자막·엔딩처럼 세로 스크롤이 사는 영역이다. */
const STEP = 80;
const RESET_MS = 300;

interface WheelPagingOptions {
  onPrev?: () => void;
  onNext?: () => void;
  enabled?: boolean;
}

export function useWheelPaging(
  ref: RefObject<HTMLElement | null>,
  { onPrev, onNext, enabled = true }: WheelPagingOptions,
) {
  const handlers = useRef({ onPrev, onNext });
  useEffect(() => { handlers.current = { onPrev, onNext }; });

  useEffect(() => {
    const element = ref.current;
    if (!element || !enabled) return;
    let acc = 0;
    let lastAt = 0;
    const onWheel = (event: WheelEvent) => {
      if (event.target instanceof HTMLElement && event.target.closest("[data-wheel-pass]")) return;
      event.preventDefault();
      const now = Date.now();
      if (now - lastAt > RESET_MS) acc = 0;
      lastAt = now;
      acc += Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
      if (Math.abs(acc) < STEP) return;
      const forward = acc > 0;
      acc = 0;
      (forward ? handlers.current.onNext : handlers.current.onPrev)?.();
    };
    element.addEventListener("wheel", onWheel, { passive: false });
    return () => element.removeEventListener("wheel", onWheel);
  }, [ref, enabled]);
}
