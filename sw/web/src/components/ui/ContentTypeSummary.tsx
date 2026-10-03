/*
  파일명: /components/ui/ContentTypeSummary.tsx
  기능: 콘텐츠 타입별 개수 요약 + 라디오 필터
  책임: 타입별 아이콘과 개수를 많은 순으로 표시하고, 클릭 시 하나의 타입만 선택한다.
*/ // ------------------------------

"use client";

import { useTranslations } from "next-intl";
import { CATEGORIES } from "@/constants/categories";
import CategoryChip from "./CategoryChip";
import type { ContentTypeCounts } from "@/types/content";

type Size = "sm" | "md" | "lg";

const SIZE_CONFIG: Record<Size, { text: string; gap: string }> = {
  sm: { text: "text-xs", gap: "gap-1.5" },
  md: { text: "text-xs md:text-sm", gap: "gap-2" },
  lg: { text: "text-sm md:text-base", gap: "gap-2.5" },
};

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
  const typeCounts = CATEGORIES
    .map(m => ({
      type: m.dbType,
      label: t(m.id),
      count: counts ? counts[m.dbType] : items.filter(item => item.type === m.dbType).length,
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
          <CategoryChip
            key={item.type}
            media={item.type}
            role="radio"
            ariaLabel={`${item.label} (${item.count})`}
            onClick={() => onChange(item.type)}
            selected={isActive}
            className={`h-auto min-w-0 gap-1 px-1.5 py-1 ${fourCategoryHeight}`}
          >
            <span className={`${cfg.text} flex min-w-[2rem] items-center justify-center text-center tabular-nums font-medium`}>
              ({item.count})
            </span>
          </CategoryChip>
        );
      })}
    </div>
  );
}
