/*
  파일명: /components/ui/ContentTypeSummary.tsx
  기능: 콘텐츠 타입별 개수 요약 + 토글 필터
  책임: 타입별 아이콘과 개수를 많은 순으로 표시하고, 클릭 시 필터링한다.
*/ // ------------------------------

"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { BookOpen, Film, Gamepad2, Music } from "lucide-react";

type Size = "sm" | "md" | "lg";

const SIZE_CONFIG: Record<Size, { icon: string; text: string; gap: string }> = {
  sm: { icon: "size-4 md:size-5", text: "text-xs", gap: "gap-2" },
  md: { icon: "size-4 md:size-6", text: "text-xs md:text-sm", gap: "gap-2.5" },
  lg: { icon: "size-5 md:size-7", text: "text-sm md:text-base", gap: "gap-3" },
};

const CONTENT_TYPE_META = [
  { type: "BOOK", key: "book" as const, Icon: BookOpen },
  { type: "VIDEO", key: "video" as const, Icon: Film },
  { type: "GAME", key: "game" as const, Icon: Gamepad2 },
  { type: "MUSIC", key: "music" as const, Icon: Music },
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
  const t = useTranslations("content.category");
  const typeCounts = CONTENT_TYPE_META
    .map(m => ({ ...m, label: t(m.key), count: items.filter(item => item.type === m.type).length }))
    .filter(m => m.count > 0)
    .sort((a, b) => b.count - a.count);

  if (typeCounts.length === 0) return null;

  return (
    <div className={`flex items-center justify-center ${cfg.gap} ${className}`}>
      {typeCounts.map((item) => {
        const isActive = value === item.type;
        return (
          <button
            key={item.type}
            onClick={() => onChange(isActive ? null : item.type)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border ${
              isActive
                ? "border-accent/60 bg-accent/15 text-accent"
                : "border-white/10 bg-white/5 text-text-secondary hover:border-white/20 hover:bg-white/10"
            }`}
          >
            <item.Icon className={`${cfg.icon} ${isActive ? "text-accent" : "text-amber-400/70"}`} />
            <span className={`${cfg.text} tabular-nums font-medium`}>({item.count})</span>
          </button>
        );
      })}
    </div>
  );
}
