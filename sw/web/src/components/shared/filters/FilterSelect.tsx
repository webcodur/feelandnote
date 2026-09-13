"use client";

import { useState, type ReactNode } from "react";
import Button from "@/components/ui/Button";
import FilterModal from "./FilterModal";
import type { FilterOption } from "./FilterChipDropdown";

interface FilterSelectProps {
  label: string;
  value: string;
  isActive: boolean;
  isLoading?: boolean;
  options: FilterOption[];
  currentValue: string;
  onSelect: (value: string) => void;
  icon?: ReactNode;
  searchable?: boolean;
  searchPlaceholder?: string;
}

export default function FilterSelect({
  label, value, isActive, isLoading = false, options, currentValue, onSelect,
  icon, searchable = false, searchPlaceholder,
}: FilterSelectProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        unstyled
        onClick={() => setIsOpen(true)}
        disabled={isLoading}
        aria-label={`${label}: ${value}`}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        className={`flex items-center justify-center overflow-hidden whitespace-nowrap rounded-md border bg-white/5 transition-none hover:bg-white/10 outline-none focus-visible:ring-2 focus-visible:ring-accent ${isActive ? "border-accent shadow-[0_0_10px_rgba(212,175,55,0.2)]" : "border-accent/20 hover:border-accent/40"}`}
      >
        <span className="flex min-h-10 w-full items-stretch">
          <span className={`flex items-center justify-center border-r border-accent/10 bg-black/40 px-2.5 ${isActive ? "text-accent" : "opacity-70"}`}>
            {icon ?? label}
          </span>
          <span className={`flex min-w-0 flex-1 items-center justify-center bg-white/[0.02] px-3 text-sm font-bold ${isActive ? "text-accent" : "text-text-primary"}`}>
            <span className="truncate">{value}</span>
          </span>
        </span>
      </Button>
      <FilterModal
        title={label}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        current={currentValue}
        options={options}
        onChange={onSelect}
        searchable={searchable}
        searchPlaceholder={searchPlaceholder}
      />
    </>
  );
}
