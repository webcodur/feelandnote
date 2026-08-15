import { useEffect, useRef } from "react";

/** 줄 단위 휠(주로 Firefox)을 실제 본문 줄 높이로 환산한다. 고정값 16px은 실제보다 짧게 움직였다. */
function getLineHeight(element: HTMLElement) {
  const computed = Number.parseFloat(window.getComputedStyle(element).lineHeight);
  return Number.isFinite(computed) && computed > 0 ? computed : 16;
}

/**
 * 내부 스크롤 칸이 더 움직일 수 없을 때 휠을 페이지로 정확히 한 번 넘긴다.
 * React의 passive wheel 위임을 피하려고 대상 요소에 취소 가능한 리스너를 직접 단다.
 */
export function useWheelBoundaryPassThrough() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const handleWheel = (event: WheelEvent) => {
      const cannotScroll = element.scrollHeight <= element.clientHeight + 1;
      const atTop = element.scrollTop <= 0;
      const atBottom = element.scrollTop + element.clientHeight >= element.scrollHeight - 1;
      const leavesInnerScroll =
        cannotScroll || (event.deltaY < 0 && atTop) || (event.deltaY > 0 && atBottom);

      if (!leavesInnerScroll || event.deltaY === 0) return;

      event.preventDefault();

      const deltaMultiplier =
        event.deltaMode === WheelEvent.DOM_DELTA_LINE
          ? getLineHeight(element)
          : event.deltaMode === WheelEvent.DOM_DELTA_PAGE
            ? window.innerHeight
            : 1;

      /* "auto"는 html의 scroll-behavior: smooth를 따라가 매 휠마다 애니메이션을 새로 시작한다.
         그러면 앞선 이동의 남은 거리가 버려져 굴린 양보다 덜 가고 튕겨 보인다. 즉시 이동시킨다. */
      window.scrollBy({ top: event.deltaY * deltaMultiplier, behavior: "instant" });
    };

    element.addEventListener("wheel", handleWheel, { passive: false });
    return () => element.removeEventListener("wheel", handleWheel);
  }, []);

  return ref;
}
