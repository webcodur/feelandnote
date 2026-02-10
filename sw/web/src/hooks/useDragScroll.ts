import { useState, useRef, useEffect, useLayoutEffect, useCallback, type RefObject } from "react";

interface UseDragScrollReturn {
  containerRef: RefObject<HTMLDivElement | null>;
  scrollY: number;
  maxScroll: number;
  isDragging: boolean;
  canScroll: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
}

// 드래그로 세로 스크롤하는 커스텀 훅 (Native ScrollTop 제어)
export default function useDragScroll(): UseDragScrollReturn {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollY, setScrollY] = useState(0);
  const [maxScroll, setMaxScroll] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  
  // 드래그 상태
  const dragStartY = useRef(0);
  const scrollStartY = useRef(0);

  // maxScroll 계산 함수
  const recalculate = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const contentHeight = container.scrollHeight;
    const containerHeight = container.clientHeight;
    setMaxScroll(Math.max(0, contentHeight - containerHeight));
    // 현재 스크롤 위치 동기화
    setScrollY(container.scrollTop);
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

    // 스크롤 이벤트 리스너 (그라데이션 표시용 상태 업데이트)
    const handleScroll = () => {
        setScrollY(container.scrollTop);
    };
    container.addEventListener("scroll", handleScroll);

    return () => {
        observer.disconnect();
        container.removeEventListener("scroll", handleScroll);
    };
  }, [recalculate]);

  const handleDragStart = useCallback((clientY: number) => {
    if (!containerRef.current) return;
    setIsDragging(true);
    dragStartY.current = clientY;
    scrollStartY.current = containerRef.current.scrollTop;
    
    // 텍스트 선택 방지
    document.body.style.userSelect = "none";
  }, []);

  const handleDragMove = useCallback((clientY: number) => {
    if (!isDragging || !containerRef.current) return;
    const delta = dragStartY.current - clientY;
    containerRef.current.scrollTop = scrollStartY.current + delta;
  }, [isDragging]);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    document.body.style.userSelect = "";
  }, []);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (maxScroll <= 0) return;
    // 기본 드래그 방지 (브라우저 기본 드래그 앤 드롭 동작 방지)
    e.preventDefault(); 
    handleDragStart(e.clientY);
  }, [maxScroll, handleDragStart]);

  // 전역 이벤트 리스너 (마우스 드래그)
  useEffect(() => {
    if (!isDragging) return;

    const onMove = (e: MouseEvent) => handleDragMove(e.clientY);
    const onUp = () => handleDragEnd();
    
    // 마우스가 브라우저 밖으로 나갔을 때도 처리를 위해 window에 부착
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);

    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [isDragging, handleDragMove, handleDragEnd]);

  return {
    containerRef,
    scrollY,
    maxScroll,
    isDragging,
    canScroll: maxScroll > 0,
    onMouseDown,
  };
}
