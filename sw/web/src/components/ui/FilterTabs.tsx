"use client";

import Button from "./Button";
import type { LucideIcon } from "lucide-react";

export interface FilterTabItem<T extends string = string> {
  value: T;
  label: string;
  icon: LucideIcon;
}

interface FilterTabsProps<T extends string> {
  items: FilterTabItem<T>[];
  activeValue: T;
  counts?: Partial<Record<T, number>>;
  onSelect: (value: T) => void;
  isLoading?: boolean;
  hideZeroCounts?: boolean;
}

export default function FilterTabs<T extends string>({
  items,
  activeValue,
  counts,
  onSelect,
  isLoading,
  hideZeroCounts = false,
}: FilterTabsProps<T>) {
  return (
    <div className="overflow-x-auto scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
      <div className="flex gap-2">
        {items.map(({ value, label, icon: Icon }) => {
          const isActive = activeValue === value;
          const count = counts?.[value];
          const isDisabled = isLoading || (hideZeroCounts && count === 0);

          return (
            <Button
              unstyled
              key={value}
              onClick={() => onSelect(value)}
              disabled={isDisabled}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap shrink-0 ${
                isActive
                  ? "bg-accent text-white"
                  : "bg-white/5 text-text-secondary hover:bg-white/10 hover:text-text-primary"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <Icon size={14} />
              {label}
              {count !== undefined && (
                <span className={isActive ? "text-white/80" : "text-text-tertiary"}>
                  ({typeof count === "number" ? count.toLocaleString() : count})
                </span>
              )}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
