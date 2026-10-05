"use client";

import { useEffect, useRef, type RefObject } from "react";

/* 휠·트랙패드 스크롤을 좌우 페이지 넘기기로 쓴다 — 장면 뷰어·전체화면 공통.
   휠 한 틱이 임계(80px, 노치 100~120보다 조금 아래)를 넘을 때마다 이전·다음 이동을 요청한다.
   문장·이미지 중 무엇을 넘길지는 호출자가 버튼·방향키와 같은 이동 함수로 결정한다.
   연속 스트림이 멈추면 누적을 비워 다음 제스처를 새로 센다.
   [data-wheel-pass] 안의 휠은 그대로 둔다 — 자막·엔딩처럼 세로 스크롤이 사는 영역이다. */
const STEP = 80;
const RESET_MS = 300;

interface WheelPagingOptions {
  onPrev?: () => void;
  onNext?: () => void;
  enabled?: boolean;
  /* 확대·축소 등으로 입력을 처리했으면 true를 반환해 페이지 넘기기를 건너뛴다. */
  consumeWheel?: (event: WheelEvent) => boolean;
}

export function useWheelPaging(
  ref: RefObject<HTMLElement | null>,
  { onPrev, onNext, enabled = true, consumeWheel }: WheelPagingOptions,
) {
  const handlers = useRef({ onPrev, onNext, consumeWheel });
  useEffect(() => { handlers.current = { onPrev, onNext, consumeWheel }; });

  useEffect(() => {
    const element = ref.current;
    if (!element || !enabled) return;
    let acc = 0;
    let lastAt = 0;
    const onWheel = (event: WheelEvent) => {
      if (event.target instanceof HTMLElement && event.target.closest("[data-wheel-pass]")) return;
      event.preventDefault();
      if (handlers.current.consumeWheel?.(event)) {
        acc = 0;
        lastAt = 0;
        return;
      }
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
