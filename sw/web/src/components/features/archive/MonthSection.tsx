"use client";

import { ChevronRight, ChevronDown, Calendar } from "lucide-react";
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
  label,
  itemCount,
  isCollapsed,
  onToggle,
  children,
}: MonthSectionProps) {
  if (itemCount === 0) return null;

  return (
    <div key={monthKey}>
      <Button
        unstyled
        onClick={onToggle}
        className="flex items-center gap-2 mb-3 w-full text-left group"
      >
        <div className="flex items-center gap-1.5 text-text-primary">
          {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
          <Calendar size={16} className="text-text-secondary" />
          <h3 className="text-sm font-bold">{label}</h3>
        </div>
        <span className="text-xs text-text-secondary">({itemCount})</span>
        <div className="flex-1 h-px bg-border ml-2 group-hover:bg-text-secondary/30" />
      </Button>

      {!isCollapsed && <div>{children}</div>}
    </div>
  );
}
