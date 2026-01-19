/*
  파일명: /components/features/user/contentLibrary/section/MonthSection.tsx
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
    <div id={`month-section-${monthKey}`} className="mb-12">
      {/* 헤더 버튼: 기둥과 텍스트 중심의 고전적 레이아웃 */}
      <button
        onClick={onToggle}
        className={cn(
          "group relative flex items-center w-full py-4 text-left transition-all duration-500 rounded-sm",
          "hover:bg-accent/5 px-2",
          !isCollapsed && "mb-8"
        )}
      >
        <div className="flex items-end gap-5">
          {/* Section Pillar - 신전의 기둥 형상 */}
          <div 
            className={cn(
              "w-1.5 transition-all duration-700 rounded-full",
              isCollapsed 
                ? "h-8 bg-stone-border" 
                : "h-16 bg-gradient-to-b from-accent to-accent-dim shadow-glow"
            )} 
          />
          
          <div className="flex flex-col mb-1">
            <div className="flex items-baseline gap-2 leading-none">
              <span className="text-4xl sm:text-5xl font-serif font-black text-accent tracking-tighter">
                {month.padStart(2, '0')}
              </span>
              <span className="text-xl sm:text-2xl font-serif font-black text-text-secondary/40 tracking-tight">
                {year}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] font-serif font-bold text-text-secondary uppercase tracking-[0.2em]">
                {itemCount} RECORDS INSCRIBED
              </span>
            </div>
          </div>
        </div>
        
        {/* 우측 아이콘 및 보조선 */}
        <div className="ml-auto flex items-center gap-4">
          <div className={cn(
            "h-[1px] bg-gradient-to-r from-transparent via-accent/20 to-transparent transition-all duration-700",
            isCollapsed ? "w-0" : "w-12 sm:w-24"
          )} />
          <div className={cn(
            "w-10 h-10 flex items-center justify-center rounded-full border border-stone-border transition-all duration-500",
            !isCollapsed && "border-accent/40 bg-accent/5 rotate-180"
          )}>
            <ChevronIcon size={20} className={cn("transition-colors duration-500", isCollapsed ? "text-text-secondary" : "text-accent")} />
          </div>
        </div>

        {/* 하단 장식선 (닫혔을 때만) */}
        {isCollapsed && (
          <div className="absolute bottom-0 left-2 right-2 h-[1px] bg-stone-border/30" />
        )}
      </button>

      {/* Content Area */}
      {!isCollapsed && (
        <div className="animate-in fade-in slide-in-from-left-4 duration-700 fill-mode-both px-2 border-l-2 border-accent/10 ml-[3px]">
          {children}
        </div>
      )}
    </div>
  );
}
