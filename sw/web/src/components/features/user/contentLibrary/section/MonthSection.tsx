/*
  파일명: /components/features/user/contentLibrary/section/MonthSection.tsx
  기능: 월별 콘텐츠 그룹 섹션
  책임: 특정 월에 기록된 콘텐츠를 접기/펼치기 가능한 섹션으로 표시한다.
*/ // ------------------------------
"use client";

import { useMemo } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";

interface MonthSectionProps {
  monthKey: string;
  label: string;
  itemCount: number;
  isCollapsed: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(" ");
}

export default function MonthSection({
  monthKey,
  itemCount,
  isCollapsed,
  onToggle,
  children,
}: MonthSectionProps) {
  const { year, month } = useMemo(() => {
    const [y, m] = monthKey.split("-");
    return { year: y, month: parseInt(m).toString() };
  }, [monthKey]);

  if (itemCount === 0) return null;

  const ChevronIcon = isCollapsed ? ChevronRight : ChevronDown;

  return (
    <div id={`month-section-${monthKey}`} className="mb-8">
      {/* 헤더 버튼 */}
      <button
        onClick={onToggle}
        className="group flex items-center justify-between w-full py-3 text-left"
      >
        <div className="flex flex-col">
          <div className="flex items-baseline gap-2 leading-none">
            <span className="text-4xl sm:text-5xl font-serif font-black text-accent tracking-tighter">
              {month.padStart(2, '0')}
            </span>
            <span className="text-xl sm:text-2xl font-serif font-black text-text-secondary/40 tracking-tight">
              {year}
            </span>
          </div>
          <span className="text-[10px] font-serif font-bold text-text-secondary uppercase tracking-[0.2em] mt-1">
            {itemCount} RECORDS INSCRIBED
          </span>
        </div>

        <div className={cn(
          "w-8 h-8 flex items-center justify-center rounded-full border",
          isCollapsed ? "border-border" : "border-accent/40"
        )}>
          <ChevronIcon
            size={16}
            className={isCollapsed ? "text-text-tertiary" : "text-accent"}
          />
        </div>
      </button>

      {/* 콘텐츠 영역 */}
      {!isCollapsed && (
        <div className="pt-4">
          {children}
        </div>
      )}
    </div>
  );
}
