import { useState, useRef, useEffect, useLayoutEffect, useCallback, type RefObject } from "react";

interface UseDragScrollReturn {
  containerRef: RefObject<HTMLDivElement | null>;
  scrollY: number;
  maxScroll: number;
  isDragging: boolean;
  canScroll: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
  onTouchStart: (e: React.TouchEvent) => void;
  scrollStyle: { transform: string };
}

// 드래그/터치로 세로 스크롤하는 커스텀 훅
export default function useDragScroll(): UseDragScrollReturn {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollY, setScrollY] = useState(0);
  const [maxScroll, setMaxScroll] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartY = useRef(0);
  const scrollStartY = useRef(0);

  // maxScroll 계산 함수
  const recalculate = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const contentHeight = container.scrollHeight;
    const containerHeight = container.clientHeight;
    setMaxScroll(Math.max(0, contentHeight - containerHeight));
  }, []);

  // 초기 계산 + ResizeObserver로 크기 변경 감지
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 초기 계산
    recalculate();

    // ResizeObserver로 크기 변경 감지
    const observer = new ResizeObserver(() => {
      recalculate();
    });
    observer.observe(container);

    return () => observer.disconnect();
  }, [recalculate]);

  const handleDragStart = useCallback((clientY: number) => {
    setIsDragging(true);
    dragStartY.current = clientY;
    scrollStartY.current = scrollY;
  }, [scrollY]);

  const handleDragMove = useCallback((clientY: number) => {
    if (!isDragging) return;
    const delta = dragStartY.current - clientY;
    const newScroll = Math.max(0, Math.min(maxScroll, scrollStartY.current + delta));
    setScrollY(newScroll);
  }, [isDragging, maxScroll]);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (maxScroll <= 0) return;
    e.preventDefault();
    handleDragStart(e.clientY);
  }, [maxScroll, handleDragStart]);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (maxScroll <= 0) return;
    handleDragStart(e.touches[0].clientY);
  }, [maxScroll, handleDragStart]);

  // 전역 이벤트 리스너
  useEffect(() => {
    if (!isDragging) return;

    const onMove = (e: MouseEvent) => handleDragMove(e.clientY);
    const onUp = () => handleDragEnd();
    const onTouchMove = (e: TouchEvent) => handleDragMove(e.touches[0].clientY);
    const onTouchEnd = () => handleDragEnd();

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onTouchMove);
    window.addEventListener("touchend", onTouchEnd);

    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [isDragging, handleDragMove, handleDragEnd]);

  return {
    containerRef,
    scrollY,
    maxScroll,
    isDragging,
    canScroll: maxScroll > 0,
    onMouseDown,
    onTouchStart,
    scrollStyle: { transform: `translateY(-${scrollY}px)` },
  };
}
