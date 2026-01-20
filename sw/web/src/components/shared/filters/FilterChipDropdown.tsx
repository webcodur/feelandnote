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
        className={`
          flex items-center justify-center rounded-lg border
          bg-white/5 whitespace-nowrap overflow-hidden
          ${isActive ? 'border-accent shadow-[0_0_10px_rgba(212,175,55,0.1)]' : 'border-accent/25'}
        `}
      >
        <div className="flex items-stretch justify-center w-full min-h-[2.5rem]">
          {/* 타이틀 섹션 - 고정 비율 (35%) */}
          <div className="flex-[0.35] flex items-center justify-center border-r border-accent/10 px-3 bg-black/20">
            <span className={`text-[10px] uppercase font-cinzel tracking-wide leading-none text-center ${isActive ? 'text-accent opacity-90' : 'text-text-tertiary opacity-60'}`}>
              {label}
            </span>
          </div>

          {/* 값 섹션 - 나머지 (65%) */}
          <div className="flex-[0.65] flex items-center justify-between gap-2 px-3 bg-white/[0.02]">
            <span className={`text-sm font-bold truncate ${isActive ? 'text-accent' : 'text-text-primary'}`}>
              {value}
            </span>
            <GreekChevronIcon
              size={12}
              className={`flex-shrink-0 transition-transform ${isOpen ? "rotate-180" : ""} ${isActive ? "text-accent/60" : "text-text-tertiary opacity-30"}`}
            />
          </div>
        </div>
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
