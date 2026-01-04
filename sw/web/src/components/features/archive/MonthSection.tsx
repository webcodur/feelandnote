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
  if (itemCount === 0) return null;

  const { year, month } = useMemo(() => {
    const [y, m] = monthKey.split("-");
    return { year: y, month: parseInt(m).toString() };
  }, [monthKey]);

  const ChevronIcon = isCollapsed ? ChevronRight : ChevronDown;

  return (
    <div id={`month-section-${monthKey}`} className="mb-6">
      {/* 통합 헤더: 날짜 + 기록 수 */}
      <Button
        onClick={onToggle}
        className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg select-none mb-3 ${
          isCollapsed
            ? "bg-surface border border-dashed border-border"
            : "bg-surface-hover/50"
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
