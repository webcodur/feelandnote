/*
  파일명: /components/shared/PillTabs.tsx
  기능: 컨테이너형 탭 네비게이션
  책임: Link 기반 컨테이너 탭을 제공한다. ChosenSection 스타일.
*/

"use client";

import Link from "next/link";

interface PillTabItem {
  value: string;
  label: string;
  href: string;
}

interface PillTabsProps<T extends PillTabItem> {
  tabs: readonly T[] | T[];
  activeTabValue: string;
  className?: string;
}

export default function PillTabs<T extends PillTabItem>({ tabs, activeTabValue, className = "" }: PillTabsProps<T>) {
  return (
    <div className={`flex overflow-x-auto scrollbar-hidden ${className}`}>
      <div className="inline-flex min-w-max p-1 bg-neutral-900/80 backdrop-blur-md rounded-xl border border-white/10 shadow-inner">
        {tabs.map((tab) => {
          const isActive = tab.value === activeTabValue;
          return (
            <Link
              key={tab.value}
              href={tab.href}
              className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap select-none ${
                isActive
                  ? "text-neutral-900 bg-gradient-to-br from-accent via-yellow-200 to-accent shadow-[0_0_15px_rgba(212,175,55,0.4)]"
                  : "text-text-secondary hover:text-white hover:bg-white/5"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
