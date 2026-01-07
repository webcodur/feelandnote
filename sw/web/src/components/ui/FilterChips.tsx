/*
  파일명: /components/ui/FilterChips.tsx
  기능: 필터 칩 컴포넌트
  책임: 선택 가능한 칩 형태의 필터 UI를 제공한다.
*/ // ------------------------------

"use client";

import { LucideIcon } from "lucide-react";
import Button from "@/components/ui/Button";

export interface ChipOption<T extends string = string> {
  value: T;
  label: string;
  icon?: LucideIcon;
}

type ChipVariant = "filled" | "outlined" | "subtle";

interface FilterChipsProps<T extends string = string> {
  options: ChipOption<T>[];
  value: T;
  onChange: (value: T) => void;
  variant?: ChipVariant;
  compact?: boolean;
  showIcon?: boolean;
}

const variantStyles: Record<ChipVariant, { active: string; inactive: string }> = {
  filled: {
    active: "bg-bg-secondary text-text-primary",
    inactive: "text-text-secondary hover:text-text-primary hover:bg-white/5",
  },
  outlined: {
    active: "bg-accent/10 border border-accent text-accent",
    inactive: "bg-transparent border border-border text-text-secondary hover:border-accent hover:text-text-primary",
  },
  subtle: {
    active: "bg-accent/20 text-accent",
    inactive: "bg-transparent text-text-secondary hover:bg-white/5 hover:text-text-primary",
  },
};

export function FilterChips<T extends string = string>({
  options,
  value,
  onChange,
  variant = "filled",
  compact = false,
  showIcon = true,
}: FilterChipsProps<T>) {
  const styles = variantStyles[variant];

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {options.map((option) => {
        const Icon = option.icon;
        const isActive = value === option.value;

        return (
          <Button
            unstyled
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`
              rounded-lg font-medium
              ${compact ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-sm"}
              ${isActive ? styles.active : styles.inactive}
            `}
          >
            <span className="flex items-center gap-1.5">
              {showIcon && Icon && <Icon size={compact ? 12 : 14} />}
              {option.label}
            </span>
          </Button>
        );
      })}
    </div>
  );
}
