/*
  파일명: /components/ui/ContentTypeSummary.tsx
  기능: 콘텐츠 타입별 개수 요약 + 토글 필터
  책임: 타입별 아이콘과 개수를 많은 순으로 표시하고, 클릭 시 필터링한다.
*/ // ------------------------------

"use client";

import React from "react";
import { BookOpen, Film, Gamepad2, Music } from "lucide-react";

type Size = "sm" | "md" | "lg";

const SIZE_CONFIG: Record<Size, { icon: number; text: string; gap: string }> = {
  sm: { icon: 16, text: "text-sm", gap: "gap-4" },
  md: { icon: 18, text: "text-base", gap: "gap-5" },
  lg: { icon: 20, text: "text-lg", gap: "gap-6" },
};

const CONTENT_TYPE_META = [
  { type: "BOOK", label: "도서", Icon: BookOpen },
  { type: "VIDEO", label: "영상", Icon: Film },
  { type: "GAME", label: "게임", Icon: Gamepad2 },
  { type: "MUSIC", label: "음악", Icon: Music },
];

interface ContentTypeSummaryProps {
  /** 각 아이템의 type 필드를 추출하기 위한 배열 */
  items: { type: string }[];
  /** 현재 선택된 타입 (null이면 전체) */
  value: string | null;
  /** 타입 선택/해제 콜백 */
  onChange: (type: string | null) => void;
  /** 크기 (sm | md | lg, 기본 sm) */
  size?: Size;
  className?: string;
}

export function ContentTypeSummary({ items, value, onChange, size = "sm", className = "" }: ContentTypeSummaryProps) {
  const cfg = SIZE_CONFIG[size];
  const typeCounts = CONTENT_TYPE_META
    .map(m => ({ ...m, count: items.filter(item => item.type === m.type).length }))
    .filter(m => m.count > 0)
    .sort((a, b) => b.count - a.count);

  if (typeCounts.length === 0) return null;

  return (
    <div className={`flex items-center justify-center ${cfg.gap} ${className}`}>
      {typeCounts.map((item, i) => {
        const isActive = value === item.type;
        return (
          <React.Fragment key={item.type}>
            {i > 0 && <span className="text-text-tertiary/30 text-sm select-none">&gt;</span>}
            <button
              onClick={() => onChange(isActive ? null : item.type)}
              className={`flex items-center gap-1.5 ${cfg.text} transition-colors ${
                isActive
                  ? "text-accent font-bold"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              <span className={isActive ? "text-accent" : "text-accent/70"}>
                <item.Icon size={cfg.icon} />
              </span>
              <span>{item.label}({item.count})</span>
            </button>
          </React.Fragment>
        );
      })}
    </div>
  );
}
