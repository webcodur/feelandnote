/* ─────────────────────────────────────────────
 * [celeb 상세] 공통 — 기록 탭 머리(공용 탭 UI)
 * - 목차 위치: 공통 (library/media 등 탭 구획)
 * - 데이터: tabs/activeKey props
 * - 함께 보기: LibraryTabs.tsx, FigureMediaTabs.tsx
 * ───────────────────────────────────────────── */
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
  className?: string;
  mobileTextClassName?: string;
}

export default function ArchiveTabsHeader<T extends string>({
  tabs,
  activeKey,
  onChange,
  columnsClassName,
  ariaLabel,
  className,
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
        // 제목 줄(64px 고정 헤더 + 50px 제목) 아래에 달라붙는다. 판을 깔아 겹침을 막는다.
        "celeb-mode-tabs sticky top-[114px] z-[39] mb-6 grid border-b border-white/10 bg-[color-mix(in_srgb,var(--material-panel,var(--color-bg-card))_92%,transparent)] backdrop-blur-md sm:mb-7",
        columnsClassName,
        className,
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
              "relative flex h-10 items-center justify-center px-1 text-center text-sm font-medium leading-none sm:h-12 sm:px-2 sm:text-xl",
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
