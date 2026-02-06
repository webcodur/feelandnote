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
        className="group relative flex flex-col items-center w-full py-3 px-3 -mx-3 rounded-xl overflow-hidden"
      >
        {/* 호버 배경 텍스처 */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 pointer-events-none">
          <div className="absolute inset-0 bg-accent/[0.04] bg-texture-noise" />
          <div className="absolute inset-0 bg-gradient-to-b from-accent/[0.06] via-transparent to-transparent" />
        </div>

        <div className="relative flex items-baseline gap-2 leading-none">
          <span className={cn(
            "text-4xl sm:text-5xl font-serif font-black text-accent tracking-tighter",
            "group-hover:drop-shadow-[0_0_12px_rgba(212,175,55,0.4)]"
          )}>
            {month.padStart(2, '0')}
          </span>
          <span className="text-xl sm:text-2xl font-serif font-black text-text-secondary/40 group-hover:text-text-secondary/60 tracking-tight">
            {year}
          </span>
          <ChevronIcon
            size={14}
            className={cn(
              "ml-1 group-hover:text-accent",
              isCollapsed ? "text-text-tertiary" : "text-accent"
            )}
          />
        </div>
        <span className="relative text-[10px] font-serif font-bold text-text-secondary uppercase tracking-[0.2em] mt-1">
          {itemCount} RECORDS INSCRIBED
        </span>
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
