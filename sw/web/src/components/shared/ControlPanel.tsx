/*
  파일명: /components/shared/ControlPanel.tsx
  기능: 접기/펼치기 가능한 제어 패널 셸
  책임: 타이틀 바 + 장식 라인 + grid 애니메이션으로 자식 요소를 감싸는 공통 UI
*/
"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ControlPanelProps {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  isExpanded: boolean;
  onToggleExpand: () => void;
  className?: string;
  /** 장식 그라데이션 라인 너비 (기본: w-12, 모바일용: w-8 등) */
  lineWidth?: string;
}

export default function ControlPanel({
  title,
  icon,
  children,
  isExpanded,
  onToggleExpand,
  className,
  lineWidth = "w-12",
}: ControlPanelProps) {
  return (
    <div
      className={cn(
        "border border-white/10 bg-black/40 backdrop-blur-md rounded-lg overflow-hidden relative group",
        className
      )}
    >
      {/* 타이틀 바 */}
      <button
        type="button"
        onClick={onToggleExpand}
        className="w-full relative flex items-center justify-center gap-3 px-6 py-2 bg-white/5 border-b border-white/5 hover:bg-white/10 transition-all z-10"
      >
        <div
          className={cn(
            "h-px bg-gradient-to-r from-transparent to-accent/50 transition-opacity",
            lineWidth,
            isExpanded ? "opacity-100" : "opacity-50"
          )}
        />
        <span className="font-sans text-base font-bold text-accent tracking-[0.2em] drop-shadow-sm flex items-center gap-2">
          {icon}
          {title}
        </span>
        <div
          className={cn(
            "h-px bg-gradient-to-l from-transparent to-accent/50 transition-opacity",
            lineWidth,
            isExpanded ? "opacity-100" : "opacity-50"
          )}
        />
      </button>

      {/* 접히는 영역 */}
      <div
        className={cn(
          "grid transition-all duration-500 ease-in-out relative z-10",
          isExpanded
            ? "grid-rows-[1fr] opacity-100"
            : "grid-rows-[0fr] opacity-0"
        )}
      >
        <div className="overflow-hidden">{children}</div>
      </div>
    </div>
  );
}
