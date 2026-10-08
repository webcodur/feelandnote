"use client";

import type { CSSProperties, ReactNode } from "react";
import CategoryChip from "@/components/ui/CategoryChip";
import { cn } from "@/lib/utils";
import { LIBRARY_CONTROL_LAYOUT as layout } from "./libraryControlLayout";

export interface LibraryCategoryOption {
  key: string;
  label: string;
  count?: number;
  disabled?: boolean;
}

export default function LibraryCategoryPicker({
  options, value, onChange, ariaLabel, trailing, className,
}: {
  options: LibraryCategoryOption[];
  value: string;
  onChange: (key: string) => void;
  ariaLabel: string;
  trailing?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mx-auto flex min-w-0 items-stretch justify-center gap-2", layout.width, className)}>
      <div role="radiogroup" aria-label={ariaLabel}
        className="grid min-w-0 flex-1 auto-rows-fr grid-cols-2 gap-2 [&>button:last-child:nth-child(odd)]:col-span-2 sm:grid-cols-[repeat(var(--category-count),minmax(0,1fr))] sm:[&>button:last-child:nth-child(odd)]:col-span-1"
        style={{ "--category-count": Math.max(1, options.length) } as CSSProperties}
        onKeyDown={(event) => {
          const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>("button:not(:disabled)"));
          const index = buttons.indexOf(event.target as HTMLButtonElement);
          const steps: Record<string, number> = {
            ArrowLeft: -1, ArrowRight: 1, ArrowUp: -1, ArrowDown: 1, Home: -index, End: buttons.length - 1 - index,
          };
          const step = steps[event.key];
          if (index < 0 || step === undefined) return;
          event.preventDefault();
          const next = buttons[(index + step + buttons.length) % buttons.length];
          next?.focus();
          next?.click();
        }}>
        {options.map((option) => (
          <CategoryChip
            key={option.key}
            role="radio"
            ariaLabel={option.count === undefined ? option.label : `${option.label} (${option.count})`}
            selected={option.key === value && !option.disabled}
            disabled={option.disabled}
            onClick={() => onChange(option.key)}
            className={layout.chip}
          >
            <span className="min-w-0 text-center leading-5 [overflow-wrap:anywhere]">{option.label}</span>
            {option.count !== undefined && <span className="shrink-0 tabular-nums">{option.count}</span>}
          </CategoryChip>
        ))}
      </div>
      {trailing}
    </div>
  );
}
