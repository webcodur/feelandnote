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
    <div id={`month-section-${monthKey}`} className="mb-6">
      {/* 통합 헤더: 날짜 + 기록 수 */}
      <Button
        onClick={onToggle}
        className={`flex items-center gap-3 w-fit px-4 py-3 rounded-lg select-none mb-3 border ${
          isCollapsed
            ? "bg-surface border-dashed border-border/50"
            : "bg-accent/10 border-accent/30"
        }`}
      >
        <div className="flex items-baseline gap-1">
          <span className="text-lg font-bold text-text-primary">{year}년 {month}월</span>
        </div>
        <span className="text-sm text-text-tertiary">·</span>
        <span className="text-sm text-text-secondary">{itemCount}개의 기록</span>
        <ChevronIcon size={16} className="text-text-tertiary ml-auto" />
      </Button>

      {/* Content Area */}
      {!isCollapsed && <div>{children}</div>}
    </div>
  );
}
