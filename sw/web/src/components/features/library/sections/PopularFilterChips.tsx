/*
  파일명: /components/features/library/sections/PopularFilterChips.tsx
  기능: 인기 작품 화면의 고르는 줄
  책임: 한 줄짜리 선택지를 그린다. 위 줄(기준)은 또렷하게, 아래 줄(세부)은 옅게 둔다.
*/ // ------------------------------

"use client";

export interface ChipItem {
  value: string;
  label: string;
}

interface Props {
  items: ChipItem[];
  value: string;
  onChange: (value: string) => void;
  /** 아래 줄에 놓이는 세부 선택 — 위 줄보다 약하게 그린다 */
  subtle?: boolean;
}

export default function FilterChips({ items, value, onChange, subtle }: Props) {
  return (
    <div className="flex flex-wrap justify-center gap-2">
      {items.map((item) => {
        const active = item.value === value;
        const base = subtle ? "px-3 py-1 text-xs" : "px-4 py-2 text-sm";
        const look = active
          ? "border-accent bg-accent/10 text-accent"
          : "border-white/10 text-text-secondary hover:border-accent/50 hover:text-accent";
        return (
          <button
            key={item.value}
            type="button"
            onClick={() => onChange(item.value)}
            aria-pressed={active}
            className={`rounded-sm border ${base} ${look} active:scale-95`}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
