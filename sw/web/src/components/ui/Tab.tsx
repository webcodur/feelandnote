/*
  파일명: /components/ui/Tab.tsx
  기능: 탭 컴포넌트
  책임: 탭 네비게이션 UI를 제공한다.
*/ // ------------------------------

"use client";

import { ReactNode, createContext, useContext, useRef, useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";

// #region Context
interface TabIndicator {
  left: number;
  width: number;
}

interface TabsContextValue {
  registerTab: (id: string, element: HTMLElement, active: boolean) => void;
  unregisterTab: (id: string) => void;
  setHoveredTab: (id: string | null) => void;
}

const TabsContext = createContext<TabsContextValue | null>(null);
// #endregion

// #region Props
interface TabProps {
  label: ReactNode;
  active: boolean;
  onClick?: () => void;
  className?: string;
}

interface LinkTabProps {
  href: string;
  label: ReactNode;
  active: boolean;
}

interface TabsProps {
  children: ReactNode;
  className?: string;
}
// #endregion

const tabBaseClass = "py-1 md:py-1.5 px-0 rounded-none relative font-serif font-bold cursor-pointer flex items-center gap-1.5 transition-colors text-sm md:text-base";
const activeClass = "text-accent";
const inactiveClass = "text-text-secondary hover:text-text-primary";

// #region Tab 컴포넌트
export function Tab({ label, active, onClick, className = "" }: TabProps) {
  const ref = useRef<HTMLDivElement>(null);
  const id = useRef(Math.random().toString(36).slice(2)).current;
  const context = useContext(TabsContext);

  useEffect(() => {
    if (!ref.current || !context) return;
    context.registerTab(id, ref.current, active);
    return () => context.unregisterTab(id);
  }, [id, active, context]);

  const handleMouseEnter = useCallback(() => {
    context?.setHoveredTab(id);
  }, [context, id]);

  const handleMouseLeave = useCallback(() => {
    context?.setHoveredTab(null);
  }, [context]);

  return (
    <div
      ref={ref}
      className={`${tabBaseClass} ${active ? activeClass : inactiveClass} ${className}`}
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {label}
    </div>
  );
}

export function LinkTab({ href, label, active }: LinkTabProps) {
  const ref = useRef<HTMLAnchorElement>(null);
  const id = useRef(Math.random().toString(36).slice(2)).current;
  const context = useContext(TabsContext);

  useEffect(() => {
    if (!ref.current || !context) return;
    context.registerTab(id, ref.current, active);
    return () => context.unregisterTab(id);
  }, [id, active, context]);

  const handleMouseEnter = useCallback(() => {
    context?.setHoveredTab(id);
  }, [context, id]);

  const handleMouseLeave = useCallback(() => {
    context?.setHoveredTab(null);
  }, [context]);

  return (
    <Link
      ref={ref}
      href={href}
      className={`${tabBaseClass} no-underline ${active ? activeClass : inactiveClass}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {label}
    </Link>
  );
}
// #endregion

// #region Tabs 컴포넌트
export function Tabs({ children, className = "" }: TabsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const tabsRef = useRef<Map<string, { element: HTMLElement; active: boolean }>>(new Map());
  const [indicator, setIndicator] = useState<TabIndicator | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [updateTrigger, setUpdateTrigger] = useState(0);
  const isInitialRender = useRef(true);

  // indicator 업데이트 로직을 메모이제이션하여 재사용 가능하게 분리
  const updateIndicator = useCallback(() => {
    if (!containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();

    let targetTab: { element: HTMLElement; active: boolean } | undefined;

    if (hoveredId) {
      targetTab = tabsRef.current.get(hoveredId);
    } else {
      for (const tab of tabsRef.current.values()) {
        if (tab.active) {
          targetTab = tab;
          break;
        }
      }
    }

    if (targetTab) {
      const tabRect = targetTab.element.getBoundingClientRect();
      setIndicator({
        left: tabRect.left - containerRect.left,
        width: tabRect.width,
      });
    }
  }, [hoveredId]);

  // 1. 상태 변경 시 업데이트 (즉시 및 트랜지션 후 재측정)
  useEffect(() => {
    updateIndicator();
    // 첫 렌더 후 트랜지션 활성화
    if (isInitialRender.current) {
      requestAnimationFrame(() => { isInitialRender.current = false; });
    }
    // 폰트 두께 변화나 scale 트랜지션 완료 후의 너비를 정확히 잡기 위해 두 번 측정
    const timeoutId = setTimeout(updateIndicator, 150);
    const timeoutId2 = setTimeout(updateIndicator, 310); // transition duration(300ms) 직후
    return () => {
      clearTimeout(timeoutId);
      clearTimeout(timeoutId2);
    };
  }, [updateIndicator, updateTrigger]);

  // 2. 윈도우 리사이즈 및 레이아웃 변경 대응
  useEffect(() => {
    const handleResize = () => updateIndicator();
    window.addEventListener("resize", handleResize);

    // ResizeObserver를 통해 개별 탭의 너비 변화를 감지
    const observers: ResizeObserver[] = [];
    tabsRef.current.forEach((tab) => {
      const observer = new ResizeObserver(() => updateIndicator());
      observer.observe(tab.element);
      observers.push(observer);
    });

    return () => {
      window.removeEventListener("resize", handleResize);
      observers.forEach(obs => obs.disconnect());
    };
  }, [updateIndicator, updateTrigger]);

  const registerTab = useCallback((id: string, element: HTMLElement, active: boolean) => {
    tabsRef.current.set(id, { element, active });
    setUpdateTrigger(prev => prev + 1);
  }, []);

  const unregisterTab = useCallback((id: string) => {
    tabsRef.current.delete(id);
    setUpdateTrigger(prev => prev + 1);
  }, []);

  const setHoveredTab = useCallback((id: string | null) => {
    setHoveredId(id);
  }, []);

  const contextValue = useMemo(
    () => ({ registerTab, unregisterTab, setHoveredTab }),
    [registerTab, unregisterTab, setHoveredTab]
  );

  return (
    <TabsContext.Provider value={contextValue}>
      <div ref={containerRef} className={`relative flex gap-4 md:gap-8 ${className}`}>
        {children}
        {indicator && (
          <span
            className={`absolute bottom-0 h-0.5 bg-accent ease-out z-10 ${isInitialRender.current ? '' : 'transition-all duration-200'}`}
            style={{
              left: indicator.left,
              width: indicator.width,
            }}
          />
        )}
      </div>
    </TabsContext.Provider>
  );
}
// #endregion
