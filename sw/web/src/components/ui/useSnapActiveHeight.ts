/*
  파일명: /components/ui/useSnapActiveHeight.ts
  기능: 가로 스냅 줄에서 "지금 보이는 쪽"의 실제 높이만 잰다
  책임: 여러 쪽이 한 줄에 나란히 있으면 컨테이너 auto-height는 align-items 값과
        무관하게 가장 긴 쪽에 묶인다(flexbox·grid·inline 공통). 순수 CSS로는 못 푸는
        문제라, 지금 스냅된 쪽만 골라 실측한 높이를 돌려준다 — 호출부가 그 값을
        컨테이너 style.height에 입히면 쪽마다 높이가 제 내용만큼만 잡힌다.
*/ // ------------------------------

import { useEffect, useState, type RefObject } from "react";

/** 컨테이너 왼쪽 끝에 가장 가까운 자식(=지금 스냅된 쪽) */
function nearestChild(deck: HTMLElement): HTMLElement | null {
  const children = Array.from(deck.children) as HTMLElement[];
  if (children.length === 0) return null;
  const deckLeft = deck.getBoundingClientRect().left;
  let nearest = children[0];
  let bestGap = Number.POSITIVE_INFINITY;
  for (const child of children) {
    const gap = Math.abs(child.getBoundingClientRect().left - deckLeft);
    if (gap < bestGap) {
      bestGap = gap;
      nearest = child;
    }
  }
  return nearest;
}

/**
 * deckRef가 가리키는 가로 스냅 줄에서, 지금 스냅된 자식의 높이를 계속 추적한다.
 * resetKey가 바뀌면(쪽 구성이 통째로 바뀔 때) 다시 관찰을 건다.
 */
export function useSnapActiveHeight(
  deckRef: RefObject<HTMLElement | null>,
  resetKey: unknown,
): number | undefined {
  const [height, setHeight] = useState<number>();

  useEffect(() => {
    const deck = deckRef.current;
    if (!deck) return;

    const sync = () => {
      const nearest = nearestChild(deck);
      if (nearest) setHeight(nearest.offsetHeight);
    };

    sync();
    deck.addEventListener("scroll", sync, { passive: true });
    const resizeObserver = new ResizeObserver(sync);
    Array.from(deck.children).forEach((child) => resizeObserver.observe(child));
    window.addEventListener("resize", sync);

    return () => {
      deck.removeEventListener("scroll", sync);
      resizeObserver.disconnect();
      window.removeEventListener("resize", sync);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  return height;
}
