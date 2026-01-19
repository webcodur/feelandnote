/*
  파일명: /components/shared/filters/FilterChipDropdown.tsx
  기능: 데스크톱용 드롭다운 필터 칩 컴포넌트
  책임: 필터 선택 UI 제공 (드롭다운 방식)
*/
"use client";

import { useState, useRef, useEffect } from "react";
import Button from "@/components/ui/Button";
import { GreekChevronIcon, NeoCheckIcon } from "@/components/ui/icons/neo-pantheon";
import { FILTER_CHIP_STYLES, FILTER_DROPDOWN_STYLES } from "@/constants/filterStyles";

export interface FilterOption {
  value: string;
  label: string;
  count?: number;
}

interface FilterChipDropdownProps {
  label: string;
  value: string;
  isActive: boolean;
  isLoading?: boolean;
  options: FilterOption[];
  currentValue: string;
  onSelect: (value: string) => void;
}

export default function FilterChipDropdown({
  label,
  value,
  isActive,
  isLoading = false,
  options,
  currentValue,
  onSelect,
}: FilterChipDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // 외부 클릭 시 닫기
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const handleSelect = (optValue: string) => {
    onSelect(optValue);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <Button
        type="button"
        unstyled
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        className={`flex items-center gap-2 ${FILTER_CHIP_STYLES.base} ${isActive ? FILTER_CHIP_STYLES.active : FILTER_CHIP_STYLES.inactive} whitespace-nowrap`}
      >
        <span className="text-xs opacity-80 uppercase font-cinzel tracking-wider">{label}</span>
        <span className="text-sm font-bold">{value}</span>
        <GreekChevronIcon size={14} className={`transition-transform ${isOpen ? "rotate-180" : ""} ${isActive ? "opacity-80" : "opacity-60"}`} />
      </Button>

      {isOpen && (
        <div className={FILTER_DROPDOWN_STYLES.container}>
          {options.map(({ value: optValue, label: optLabel, count }) => {
            const isSelected = currentValue === optValue;
            const isDisabled = count !== undefined && count === 0;

            return (
              <button
                key={optValue}
                onClick={() => !isDisabled && handleSelect(optValue)}
                disabled={isDisabled}
                className={`${FILTER_DROPDOWN_STYLES.item.base} ${
                  isSelected ? FILTER_DROPDOWN_STYLES.item.active : FILTER_DROPDOWN_STYLES.item.inactive
                } ${isDisabled ? FILTER_DROPDOWN_STYLES.item.disabled : ""}`}
              >
                <span>{optLabel}</span>
                <span className="flex items-center gap-2">
                  {count !== undefined && <span className="text-xs text-text-tertiary">{count}</span>}
                  {isSelected && <NeoCheckIcon size={16} />}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
