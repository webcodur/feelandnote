"use client";

import type { ReactNode } from "react";
import CategoryChip from "@/components/ui/CategoryChip";
import { cn } from "@/lib/utils";

export interface LibraryCategoryOption {
  key: string;
  label: string;
  count?: number;
  disabled?: boolean;
}

export default function LibraryCategoryPicker({
  options, value, onChange, ariaLabel, trailing, className, layout = "equal",
}: {
  options: LibraryCategoryOption[];
  value: string;
  onChange: (key: string) => void;
  ariaLabel: string;
  trailing?: ReactNode;
  className?: string;
  layout?: "equal" | "wrap";
}) {
  return (
    <div className={cn("flex min-w-0 items-stretch justify-center gap-1", className)}>
      <div role="radiogroup" aria-label={ariaLabel} className={cn("min-w-0 flex-1 gap-1", layout === "wrap" ? "flex flex-wrap justify-center" : "grid")}
        style={layout === "equal" ? { gridTemplateColumns: `repeat(${Math.max(1, options.length)}, minmax(0, 1fr))` } : undefined}
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
            className={cn("min-w-0 gap-1 py-1 text-xs", layout === "wrap" ? "min-h-11 max-w-full px-3" : "h-9 min-h-9 px-1.5")}
          >
            <span className={layout === "wrap" ? "break-words text-center" : "truncate"}>{option.label}</span>
            {option.count !== undefined && <span className="hidden shrink-0 tabular-nums sm:inline">{option.count}</span>}
          </CategoryChip>
        ))}
      </div>
      {trailing}
    </div>
  );
}
