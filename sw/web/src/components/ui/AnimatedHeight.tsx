/*
  파일명: /components/ui/AnimatedHeight.tsx
  기능: 높이 애니메이션 컴포넌트
  책임: ResizeObserver로 자식 요소의 높이 변화를 감지하여 부드럽게 전환한다.
*/ // ------------------------------

"use client";

import { useRef, useState, useEffect, type ReactNode } from "react";

interface AnimatedHeightProps {
  children: ReactNode;
  className?: string;
  duration?: number;
}

export default function AnimatedHeight({ children, className = "", duration = 200 }: AnimatedHeightProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) setHeight(entry.contentRect.height);
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      className={`overflow-hidden ${className}`}
      style={{
        height: height !== undefined ? height : "auto",
        transition: `height ${duration}ms ease-out`,
      }}
    >
      <div ref={containerRef}>{children}</div>
    </div>
  );
}
