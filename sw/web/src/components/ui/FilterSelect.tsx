"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, LucideIcon } from "lucide-react";

export interface FilterOption<T extends string = string> {
  value: T;
  label: string;
  icon?: LucideIcon;
}

interface FilterSelectProps<T extends string = string> {
  options: FilterOption<T>[];
  value: T;
  onChange: (value: T) => void;
  icon?: LucideIcon;
  placeholder?: string;
  compact?: boolean;
  showActiveStyle?: boolean;
  defaultValue?: T;
}

export function FilterSelect<T extends string = string>({
  options,
  value,
  onChange,
  icon: Icon,
  placeholder,
  compact = false,
  showActiveStyle = true,
  defaultValue,
}: FilterSelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const isActive = showActiveStyle && defaultValue !== undefined && value !== defaultValue;
  const selectedOption = options.find((opt) => opt.value === value);
  const displayLabel = selectedOption?.label || placeholder || "선택";

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`
          bg-bg-secondary border rounded-lg cursor-pointer transition-all duration-200
          hover:border-text-secondary hover:text-text-primary
          flex items-center gap-1.5
          ${compact ? "py-1 px-2 text-xs" : "py-1.5 px-3 text-sm"}
          ${isActive ? "border-accent text-accent" : "border-border text-text-secondary"}
        `}
      >
        {Icon && <Icon size={compact ? 12 : 14} />}
        <span className="font-medium">{displayLabel}</span>
        <ChevronDown
          size={compact ? 12 : 14}
          className={`transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 bg-bg-secondary border border-border rounded-lg shadow-lg z-50 min-w-[140px] py-1 animate-fade-in">
          {options.map((option) => {
            const OptionIcon = option.icon;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`
                  w-full text-left px-3 py-2 transition-colors flex items-center gap-2
                  ${compact ? "text-xs" : "text-sm"}
                  ${value === option.value
                    ? "bg-accent/10 text-accent"
                    : "text-text-secondary hover:bg-white/5 hover:text-text-primary"
                  }
                `}
              >
                {OptionIcon && <OptionIcon size={compact ? 12 : 14} />}
                {option.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
