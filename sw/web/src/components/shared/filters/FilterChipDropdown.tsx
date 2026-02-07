/*
  파일명: /components/shared/filters/FilterChipDropdown.tsx
  기능: 데스크톱용 드롭다운 필터 칩 컴포넌트
  책임: 필터 선택 UI 제공 (드롭다운 방식)
*/
"use client";

import { useState, useRef, useEffect, useCallback, type ReactNode } from "react";
import { createPortal } from "react-dom";
import Button from "@/components/ui/Button";
import { FILTER_DROPDOWN_STYLES } from "@/constants/filterStyles";

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
  icon?: ReactNode;
}

export default function FilterChipDropdown({
  label,
  value,
  isActive,
  isLoading = false,
  options,
  currentValue,
  onSelect,
  icon,
}: FilterChipDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 드롭다운 위치 계산 (fixed 포지션이므로 뷰포트 기준)
  const updateDropdownPosition = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setDropdownPos({
      top: rect.bottom + 4,
      left: rect.left,
    });
  }, []);

  // 외부 클릭 시 닫기
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        containerRef.current && !containerRef.current.contains(target) &&
        dropdownRef.current && !dropdownRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // 열릴 때 위치 업데이트 + 스크롤/리사이즈 대응
  useEffect(() => {
    if (!isOpen) return;
    updateDropdownPosition();
    window.addEventListener("scroll", updateDropdownPosition, true);
    window.addEventListener("resize", updateDropdownPosition);
    return () => {
      window.removeEventListener("scroll", updateDropdownPosition, true);
      window.removeEventListener("resize", updateDropdownPosition);
    };
  }, [isOpen, updateDropdownPosition]);

  const handleSelect = (optValue: string) => {
    onSelect(optValue);
    setIsOpen(false);
  };

  const handleToggle = () => {
    if (!isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setDropdownPos({ top: rect.bottom + 4, left: rect.left });
    }
    setIsOpen(!isOpen);
  };

  return (
    <div ref={containerRef} className="relative">
      <Button
        type="button"
        unstyled
        onClick={handleToggle}
        disabled={isLoading}
        className={`
          flex items-center justify-center rounded-md border transition-all duration-300
          bg-white/5 whitespace-nowrap overflow-hidden
          ${isActive ? 'border-accent shadow-[0_0_10px_rgba(212,175,55,0.2)]' : 'border-accent/20 hover:border-accent/40'}
        `}
      >
        <div className="flex items-stretch justify-center w-full min-h-[2.5rem]">
          {/* 타이틀 섹션 */}
          <div className={`flex items-center justify-center border-r border-accent/10 bg-black/40 ${icon ? 'px-2.5' : 'flex-[0.35] px-3'}`}>
            {icon ? (
              <span className={isActive ? 'text-accent' : 'text-text-tertiary opacity-70'}>{icon}</span>
            ) : (
              <span className={`text-[10px] uppercase font-sans font-bold tracking-wider leading-none text-center ${isActive ? 'text-accent opacity-100' : 'text-text-tertiary opacity-70'}`}>
                {label}
              </span>
            )}
          </div>

          {/* 값 섹션 */}
          <div className={`${icon ? 'flex-1' : 'flex-[0.65]'} flex items-center justify-center px-3 ${isOpen ? 'bg-accent/10' : 'bg-white/[0.02]'}`}>
            <span className={`text-sm font-sans font-bold truncate ${isActive ? 'text-accent' : 'text-text-primary'} ${isOpen ? 'underline underline-offset-2 decoration-accent/50' : ''}`}>
              {value}
            </span>
          </div>
        </div>
      </Button>

      {isOpen && typeof document !== "undefined" && createPortal(
        <div
          ref={dropdownRef}
          className="fixed min-w-[160px] max-h-[320px] overflow-y-auto bg-black/95 backdrop-blur-xl border border-accent/30 rounded-md shadow-2xl z-[9999]"
          style={{ top: dropdownPos.top, left: dropdownPos.left }}
        >
          {options.map(({ value: optValue, label: optLabel, count }) => {
            const isSelected = currentValue === optValue;
            const isDisabled = count !== undefined && count === 0;

            return (
              <button
                key={optValue}
                onClick={() => !isDisabled && handleSelect(optValue)}
                disabled={isDisabled}
                className={`${FILTER_DROPDOWN_STYLES.item.base} ${
                  isSelected ? "bg-accent/20 text-accent font-bold" : "text-text-secondary hover:bg-accent/5 hover:text-text-primary"
                } ${isDisabled ? FILTER_DROPDOWN_STYLES.item.disabled : ""}`}
              >
                <span className="font-sans">{optLabel}</span>
                {count !== undefined && <span className={`text-xs ${isSelected ? 'text-accent/70' : 'text-text-tertiary'}`}>{count}</span>}
              </button>
            );
          })}
        </div>,
        document.body
      )}
    </div>
  );
}
