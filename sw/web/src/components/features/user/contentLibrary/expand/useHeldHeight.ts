/*
  펼침 카드가 새 작품의 소개·기록을 기다리는 동안 직전 카드의 높이를 붙든다.
  뼈대 화면은 실제 본문보다 짧거나 길어, 그대로 두면 상자가 뼈대 크기로 한 번, 본문 크기로
  또 한 번 움직인다. 바깥 AnimatedHeight는 이 상자의 크기 변화만 보므로, 붙드는 동안은
  가만히 있다가 풀릴 때 새 높이로 한 번만 옮긴다.
*/
"use client";

import { useLayoutEffect, useRef, type RefObject } from "react";

export function useHeldHeight(isHolding: boolean): RefObject<HTMLDivElement | null> {
  const ref = useRef<HTMLDivElement>(null);
  const settledHeightRef = useRef<number | null>(null);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;

    if (isHolding) {
      // 붙들 높이를 모르면(첫 마운트부터 로딩) 뼈대 크기 그대로 둔다
      const settled = settledHeightRef.current;
      if (settled === null) return;
      element.style.height = `${settled}px`;
      element.style.overflow = "clip";
      return;
    }

    element.style.height = "";
    element.style.overflow = "";
    // 붙들지 않는 동안만 실제 높이를 계속 잰다. 숨긴 트리(display:none)는 0으로 재므로 버린다.
    const sync = () => {
      const height = element.getBoundingClientRect().height;
      if (height > 0) settledHeightRef.current = height;
    };
    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(element);
    return () => observer.disconnect();
  }, [isHolding]);

  return ref;
}
