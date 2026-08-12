import { useEffect, useRef } from "react";

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
          ? 16
          : event.deltaMode === WheelEvent.DOM_DELTA_PAGE
            ? window.innerHeight
            : 1;

      window.scrollBy({ top: event.deltaY * deltaMultiplier, behavior: "auto" });
    };

    element.addEventListener("wheel", handleWheel, { passive: false });
    return () => element.removeEventListener("wheel", handleWheel);
  }, []);

  return ref;
}
