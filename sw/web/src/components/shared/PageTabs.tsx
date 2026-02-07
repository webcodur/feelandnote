"use client";

import Link from "next/link";
import { useRef, useState, useEffect, useCallback } from "react";

interface TabItem {
  label: string;
  href: string;
  value: string;
}

interface PageTabsProps<T extends TabItem> {
  tabs: readonly T[] | T[];
  activeTabValue: string;
  className?: string;
}

export default function PageTabs<T extends TabItem>({ tabs, activeTabValue, className = "" }: PageTabsProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const activeIndex = tabs.findIndex((tab) => tab.value === activeTabValue);

  // 인디케이터 위치 계산
  const updateIndicator = useCallback((index: number) => {
    const tab = tabRefs.current[index];
    const container = containerRef.current;
    if (!tab || !container) return;

    const containerRect = container.getBoundingClientRect();
    const tabRect = tab.getBoundingClientRect();

    setIndicatorStyle({
      left: tabRect.left - containerRect.left + container.scrollLeft,
      width: tabRect.width,
    });
  }, []);

  // 활성 탭 변경 시 인디케이터 업데이트
  useEffect(() => {
    if (hoveredIndex === null && activeIndex >= 0) {
      updateIndicator(activeIndex);
    }
  }, [activeIndex, hoveredIndex, updateIndicator]);

  // 리사이즈 시 인디케이터 업데이트
  useEffect(() => {
    const handleResize = () => {
      const targetIndex = hoveredIndex ?? activeIndex;
      if (targetIndex >= 0) updateIndicator(targetIndex);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [activeIndex, hoveredIndex, updateIndicator]);

  const handleMouseEnter = (index: number) => {
    setHoveredIndex(index);
    updateIndicator(index);
  };

  const handleMouseLeave = () => {
    setHoveredIndex(null);
    if (activeIndex >= 0) updateIndicator(activeIndex);
  };

  return (
    <div className={`w-full mb-10 ${className}`}>
      {/* Container with bottom border */}
      <div className="relative border-b border-accent/20">

        {/* Scrollable Area */}
        <div
          ref={containerRef}
          className="relative flex items-center justify-center gap-0 sm:gap-4 overflow-x-auto scrollbar-hidden px-2 pb-[1px]"
          onMouseLeave={handleMouseLeave}
        >
          {tabs.map((tab, index) => {
            const isActive = activeTabValue === tab.value;

            return (
              <Link
                key={tab.value}
                ref={(el) => { tabRefs.current[index] = el; }}
                href={tab.href}
                className="relative px-2.5 sm:px-6 py-3 whitespace-nowrap select-none"
                onMouseEnter={() => handleMouseEnter(index)}
              >
                {/* Text Content */}
                <span className={`
                  font-serif text-sm sm:text-base tracking-wide transition-colors duration-200
                  ${isActive
                    ? "text-accent font-bold drop-shadow-[0_0_15px_rgba(212,175,55,0.4)]"
                    : "text-stone-500 font-medium hover:text-stone-300"
                  }
                `}>
                  {tab.label}
                </span>

                {/* Active Gradient Shine */}
                {isActive && (
                  <div className="absolute inset-0 bg-gradient-to-t from-accent/5 to-transparent" />
                )}
              </Link>
            );
          })}

          {/* Sliding Indicator */}
          <div
            className="absolute bottom-0 h-[2px] bg-accent shadow-[0_0_10px_#d4af37] transition-all duration-300 ease-out"
            style={{
              left: indicatorStyle.left,
              width: indicatorStyle.width,
            }}
          />
        </div>

        {/* Decorative corner accents on the border line */}
        <div className="absolute bottom-[-2px] left-0 w-1 h-1 bg-accent/40 rounded-full" />
        <div className="absolute bottom-[-2px] right-0 w-1 h-1 bg-accent/40 rounded-full" />
      </div>
    </div>
  );
}
