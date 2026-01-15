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

const tabBaseClass = "py-3 px-0 rounded-none relative font-semibold cursor-pointer flex items-center gap-1.5";
const activeClass = "text-text-primary";
const inactiveClass = "text-text-secondary hover:text-text-primary";

// #region Tab 컴포넌트
export function Tab({ label, active, onClick }: TabProps) {
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
      className={`${tabBaseClass} ${active ? activeClass : inactiveClass}`}
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

  // indicator 업데이트 로직
  useEffect(() => {
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
  }, [hoveredId, updateTrigger]);

  const registerTab = useCallback((id: string, element: HTMLElement, active: boolean) => {
    tabsRef.current.set(id, { element, active });
    setUpdateTrigger(prev => prev + 1);
  }, []);

  const unregisterTab = useCallback((id: string) => {
    tabsRef.current.delete(id);
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
      <div ref={containerRef} className={`relative flex gap-8 border-b border-border ${className}`}>
        {children}
        {indicator && (
          <span
            className="absolute bottom-[-1px] h-0.5 bg-accent transition-all duration-200 ease-out"
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
