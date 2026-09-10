/*
  파일명: /components/ui/ContentTypeSummary.tsx
  기능: 콘텐츠 타입별 개수 요약 + 라디오 필터
  책임: 타입별 아이콘과 개수를 많은 순으로 표시하고, 클릭 시 하나의 타입만 선택한다.
*/ // ------------------------------

"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { BookOpen, Film, Gamepad2, Music, type LucideIcon } from "lucide-react";
import type { ContentType } from "@/types/database";
import type { ContentTypeCounts } from "@/types/content";

type Size = "sm" | "md" | "lg";

const SIZE_CONFIG: Record<Size, { icon: string; text: string; gap: string }> = {
  sm: { icon: "size-3.5 md:size-4", text: "text-xs", gap: "gap-1.5" },
  md: { icon: "size-3.5 md:size-5", text: "text-xs md:text-sm", gap: "gap-2" },
  lg: { icon: "size-4 md:size-6", text: "text-sm md:text-base", gap: "gap-2.5" },
};

const CONTENT_TYPE_META: readonly {
  type: ContentType;
  key: "book" | "video" | "game" | "music";
  Icon: LucideIcon;
}[] = [
  { type: "BOOK", key: "book" as const, Icon: BookOpen },
  { type: "VIDEO", key: "video" as const, Icon: Film },
  { type: "GAME", key: "game" as const, Icon: Gamepad2 },
  { type: "MUSIC", key: "music" as const, Icon: Music },
];

interface ContentTypeSummaryProps {
  /** 각 아이템의 type 필드를 추출하기 위한 배열 */
  items: readonly { type: string }[];
  counts?: ContentTypeCounts | null;
  /** 현재 선택된 타입 (null이면 아직 선택되지 않음) */
  value: string | null;
  /** 타입 선택 콜백 */
  onChange: (type: string) => void;
  /** 크기 (sm | md | lg, 기본 sm) */
  size?: Size;
  className?: string;
  ariaLabel?: string;
}

export function ContentTypeSummary({
  items,
  counts,
  value,
  onChange,
  size = "sm",
  className = "",
  ariaLabel,
}: ContentTypeSummaryProps) {
  const cfg = SIZE_CONFIG[size];
  const t = useTranslations("content.category");
  const typeCounts = CONTENT_TYPE_META
    .map(m => ({
      ...m,
      label: t(m.key),
      count: counts ? counts[m.type] : items.filter(item => item.type === m.type).length,
    }))
    .filter(m => m.count > 0)
    .sort((a, b) => b.count - a.count);

  if (typeCounts.length === 0) return null;

  // 네 종류가 모두 있어도 한 줄에 배치해 카테고리 영역의 높이를 아낀다.
  const fourCategoryHeight = typeCounts.length >= 4 ? "min-h-9 md:min-h-8" : "";
  const layoutClass =
    typeCounts.length >= 4
      ? "flex w-fit max-w-full flex-nowrap items-center justify-center gap-1"
      : `flex flex-wrap items-center justify-center ${cfg.gap}`;

  return (
    <div
      className={`${layoutClass} ${className}`}
      role="radiogroup"
      aria-label={ariaLabel}
    >
      {typeCounts.map((item) => {
        const isActive = value === item.type;
        return (
          <button
            key={item.type}
            type="button"
            role="radio"
            onClick={() => onChange(item.type)}
            aria-checked={isActive}
            className={`inline-flex min-w-0 items-center justify-center gap-1 rounded-md border px-1.5 py-1 ${fourCategoryHeight} ${
              isActive
                ? "border-accent/60 bg-accent/15 text-accent"
                : "border-white/10 bg-white/5 text-text-secondary hover:border-white/20 hover:bg-white/10"
            }`}
          >
            <item.Icon className={`${cfg.icon} ${isActive ? "text-accent" : "text-accent-dim"}`} />
            <span className={`${cfg.text} flex min-w-[2rem] items-center justify-center text-center tabular-nums font-medium`}>
              ({item.count})
            </span>
          </button>
        );
      })}
    </div>
  );
}
