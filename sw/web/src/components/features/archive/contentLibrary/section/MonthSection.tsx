/*
  파일명: /components/features/archive/contentLibrary/section/MonthSection.tsx
  기능: 월별 콘텐츠 그룹 섹션
  책임: 특정 월에 기록된 콘텐츠를 접기/펼치기 가능한 섹션으로 표시한다.
*/ // ------------------------------
"use client";

import { useMemo } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";
import Button from "@/components/ui/Button";

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
    <div id={`month-section-${monthKey}`} className="mb-4 sm:mb-6">
      {/* 통합 헤더: 날짜 + 기록 수 */}
      <button
        onClick={onToggle}
        className={`group flex items-center gap-4 w-full px-2 py-3 mb-4 transition-all duration-300 border-b border-accent-dim/10 hover:border-accent/40 ${
          isCollapsed ? "opacity-60 grayscale" : "opacity-100"
        }`}
      >
        <div className="flex items-center gap-3">
          {/* Section Pillar Decor */}
          <div className={`w-1 transition-all duration-500 ${isCollapsed ? "h-4 bg-accent-dim/20" : "h-8 bg-accent shadow-glow"}`} />
          
          <div className="flex flex-col items-start gap-0.5">
            <div className="flex items-baseline gap-2">
              <span className="text-xl sm:text-2xl font-serif font-black text-text-primary tracking-tighter italic">
                {year}
                <span className="text-[10px] sm:text-xs font-serif font-normal not-italic ml-1 opacity-60">Anno Domini</span>
              </span>
              <span className="text-lg sm:text-xl font-serif font-black text-accent tracking-widest">
                {month.padStart(2, '0')}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[9px] sm:text-[10px] font-serif font-bold text-text-tertiary uppercase tracking-[0.2em]">
                Inscribed Records / {itemCount} units
              </span>
            </div>
          </div>
        </div>
        
        <div className="ml-auto pr-2">
          <ChevronIcon size={18} className={cn("transition-transform duration-300", isCollapsed ? "text-text-tertiary" : "text-accent")} />
        </div>
      </button>

      {/* Content Area */}
      {!isCollapsed && <div className="animate-in fade-in slide-in-from-top-1 duration-200">{children}</div>}
    </div>
  );
}
