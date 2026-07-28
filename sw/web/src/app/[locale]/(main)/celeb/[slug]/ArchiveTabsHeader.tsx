"use client";

import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export interface ArchiveTabItem<T extends string> {
  key: T;
  label: string;
  desc?: string;
  icon: LucideIcon;
}

interface Props<T extends string> {
  tabs: readonly ArchiveTabItem<T>[];
  activeKey: T;
  onChange: (key: T) => void;
  columnsClassName: string;
  ariaLabel: string;
}

export default function ArchiveTabsHeader<T extends string>({
  tabs,
  activeKey,
  onChange,
  columnsClassName,
  ariaLabel,
}: Props<T>) {
  // const active = tabs.find((item) => item.key === activeKey);
  const isDense = tabs.length >= 3;

  return (
    <>
      <div
        role="tablist"
        aria-label={ariaLabel}
        className={cn(
          "mb-6 grid border-b border-white/10 sm:mb-7",
          columnsClassName,
        )}
      >
        {tabs.map((item) => {
          const Icon = item.icon;
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
              className={cn(
                "relative flex items-center justify-center px-1 text-center text-lg font-medium leading-none sm:h-16 sm:flex-row sm:gap-2.5 sm:px-2 sm:text-xl",
                isDense
                  ? "h-16 flex-col gap-1"
                  : "h-14 flex-row gap-1.5",
                isActive
                  ? "text-accent after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-accent"
                  : "text-text-tertiary hover:text-text-primary",
              )}
            >
              <Icon
                size={20}
                strokeWidth={1.8}
                className="shrink-0"
                aria-hidden
              />
              <span className="min-w-0 truncate leading-none">{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* 고른 탭의 이름과 설명을 아래에 한 번 더 보여주던 자리 — 중복이라 잠시 접어 둔다
      <div
        className={cn(
          "text-center",
          active?.desc ? "space-y-1 py-6" : "py-5",
        )}
      >
        <h3 className="font-serif text-[15px] tracking-widest text-accent/90">
          {active?.label}
        </h3>
        {active?.desc && (
          <p className="text-sm text-text-tertiary">{active.desc}</p>
        )}
      </div>
      */}
    </>
  );
}
