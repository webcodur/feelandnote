/*
  파일명: /components/ui/AnimatedHeight.tsx
  기능: 높이 애니메이션 컴포넌트
  책임: ResizeObserver로 자식 요소의 높이 변화를 감지하여 부드럽게 전환한다.
*/ // ------------------------------

"use client";

import {
  createContext,
  useContext,
  useRef,
  useState,
  useEffect,
  useLayoutEffect,
  type ReactNode,
} from "react";

interface AnimatedHeightProps {
  children: ReactNode;
  className?: string;
  duration?: number;
  independent?: boolean;
}

const HeightAnimationContext = createContext(false);

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

export default function AnimatedHeight(props: AnimatedHeightProps) {
  const hasAnimatedParent = useContext(HeightAnimationContext);

  // Let the outer boundary handle nested content changes once. Portals can opt out.
  if (hasAnimatedParent && !props.independent) {
    return <div className={props.className}><div className="w-full flow-root">{props.children}</div></div>;
  }

  return (
    <HeightAnimationContext.Provider value={true}>
      <MeasuredHeight {...props} />
    </HeightAnimationContext.Provider>
  );
}

function MeasuredHeight({
  children,
  className = "",
  duration = 320,
}: AnimatedHeightProps) {
  const innerRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | undefined>(undefined);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isReady, setIsReady] = useState(false);

  // 1. 첫 마운트 시 paint 전에 정확한 높이를 즉시 고정 (초기 깜빡임 방지)
  useIsomorphicLayoutEffect(() => {
    const el = innerRef.current;
    if (!el) return;

    const initialHeight = Math.ceil(el.getBoundingClientRect().height);
    setHeight(initialHeight);
  }, []);

  // 2. 자식 높이 변화 감지: 직전 높이를 유지한 상태에서 새 높이로 transition
  useEffect(() => {
    const el = innerRef.current;
    if (!el) return;

    let previousHeight: number | undefined;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;

      const targetHeight = Math.ceil(el.getBoundingClientRect().height);

      if (previousHeight === undefined) {
        previousHeight = targetHeight;
        setHeight(targetHeight);
        setIsReady(true);
        return;
      }

      if (Math.abs(previousHeight - targetHeight) > 1) {
        previousHeight = targetHeight;
        setIsTransitioning(true);
        setHeight(targetHeight);
      }
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // A cancelled transition or reduced-motion preference may omit transitionend.
  useEffect(() => {
    if (!isTransitioning) return;
    const timeout = window.setTimeout(() => setIsTransitioning(false), duration + 80);
    return () => window.clearTimeout(timeout);
  }, [height, isTransitioning, duration]);

  const handleTransitionEnd = (e: React.TransitionEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && e.propertyName === "height") {
      setIsTransitioning(false);
    }
  };

  return (
    <div
      className={`motion-reduce:transition-none! ${className}`}
      data-animated-height
      style={{
        height: height !== undefined ? `${height}px` : undefined,
        transition: isReady
          ? `height ${duration}ms cubic-bezier(0.25, 1, 0.5, 1)`
          : "none",
        overflow: isTransitioning ? "clip" : "visible",
        willChange: isTransitioning ? "height" : "auto",
      }}
      onTransitionEnd={handleTransitionEnd}
    >
      <div ref={innerRef} className="w-full flow-root">
        {children}
      </div>
    </div>
  );
}
