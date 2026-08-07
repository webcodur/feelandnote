"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";

export interface ArchiveTabItem<T extends string> {
  key: T;
  label: string;
}

interface Props<T extends string> {
  tabs: readonly ArchiveTabItem<T>[];
  activeKey: T;
  onChange: (key: T) => void;
  columnsClassName: string;
  ariaLabel: string;
  mobileTextClassName?: string;
}

export default function ArchiveTabsHeader<T extends string>({
  tabs,
  activeKey,
  onChange,
  columnsClassName,
  ariaLabel,
  mobileTextClassName,
}: Props<T>) {
  /* 포커스 박스는 마우스를 우선 따르고, 손을 떼면 고른 탭으로 돌아온다.
     칸이 균등 분할이라 자기 폭의 배수만큼 밀면 정확히 각 칸에 얹힌다. */
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const activeIndex = tabs.findIndex((item) => item.key === activeKey);
  const spotIndex = hoveredIndex ?? activeIndex;

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      onMouseLeave={() => setHoveredIndex(null)}
      className={cn(
        "relative mb-6 grid border-b border-white/10 sm:mb-7",
        columnsClassName,
      )}
    >
      {spotIndex >= 0 && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 border-b-2 border-accent bg-accent/[0.06] transition-transform duration-150 ease-out motion-reduce:transition-none"
          style={{
            width: `${100 / tabs.length}%`,
            transform: `translateX(${spotIndex * 100}%)`,
          }}
        />
      )}

      {tabs.map((item, index) => {
        const isActive = activeKey === item.key;

        return (
          <button
            key={item.key}
            id={`archive-tab-${item.key}`}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-controls={`archive-panel-${item.key}`}
            onClick={() => onChange(item.key)}
            onMouseEnter={() => setHoveredIndex(index)}
            onFocus={() => setHoveredIndex(index)}
            onBlur={() => setHoveredIndex(null)}
            className={cn(
              "relative flex h-12 items-center justify-center px-1 text-center text-base font-medium leading-none sm:h-16 sm:px-2 sm:text-[22px]",
              mobileTextClassName,
              isActive ? "text-accent" : "",
            )}
          >
            <span className="min-w-0 truncate leading-none">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
