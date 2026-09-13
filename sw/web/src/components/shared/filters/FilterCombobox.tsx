/*
  파일명: /components/shared/filters/FilterCombobox.tsx
  기능: 검색 가능한 드롭다운 필터 칩 (데스크톱용)
  책임: FilterChipDropdown + 검색 input 결합
*/
"use client";

import { useState, useRef, useEffect, useCallback, useMemo, useId, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Check, Search } from "lucide-react";
import Button from "@/components/ui/Button";
import { Z_INDEX } from "@/constants/zIndex";
import { FILTER_DROPDOWN_STYLES } from "@/constants/filterStyles";
import type { FilterOption } from "./FilterChipDropdown";

interface FilterComboboxProps {
  label: string;
  dropdownLabel?: string;
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

export default function FilterCombobox({
  label,
  dropdownLabel,
  value,
  isActive,
  isLoading = false,
  options,
  currentValue,
  onSelect,
  icon,
  searchable = false,
  searchPlaceholder = "",
}: FilterComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownId = useId();
  const [searchQuery, setSearchQuery] = useState("");
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const filteredOptions = useMemo(() => {
    if (!searchable || !searchQuery.trim()) return options;
    const q = searchQuery.trim().toLowerCase();
    return options.filter((opt) => opt.label.toLowerCase().includes(q));
  }, [options, searchQuery, searchable]);
  const allOption = dropdownLabel && searchable ? options.find((option) => option.value === "all") : undefined;
  const listOptions = allOption ? filteredOptions.filter((option) => option.value !== "all") : filteredOptions;

  const updateDropdownPosition = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setDropdownPos({ top: rect.bottom + 4, left: rect.left });
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
        setSearchQuery("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // 열릴 때 위치 업데이트 + 검색 input 포커스
  useEffect(() => {
    if (!isOpen) return;
    updateDropdownPosition();
    window.addEventListener("scroll", updateDropdownPosition, true);
    window.addEventListener("resize", updateDropdownPosition);
    // 검색 input 포커스
    if (searchable) {
      requestAnimationFrame(() => searchInputRef.current?.focus());
    }
    return () => {
      window.removeEventListener("scroll", updateDropdownPosition, true);
      window.removeEventListener("resize", updateDropdownPosition);
    };
  }, [isOpen, updateDropdownPosition, searchable]);

  const handleSelect = (optValue: string) => {
    onSelect(optValue);
    setIsOpen(false);
    setSearchQuery("");
  };

  const renderOption = ({ value: optValue, label: optLabel, count, icon: optIcon }: FilterOption) => {
    const isSelected = currentValue === optValue;
    const isDisabled = count === 0;
    return (
      <button
        key={optValue}
        type="button"
        onClick={() => handleSelect(optValue)}
        disabled={isDisabled}
        aria-pressed={isSelected}
        className={`${FILTER_DROPDOWN_STYLES.item.base} outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent ${isSelected ? "bg-accent/20 text-accent font-bold hover:bg-accent/25" : "text-text-secondary hover:bg-accent/5 hover:text-text-primary"} ${isDisabled ? FILTER_DROPDOWN_STYLES.item.disabled : ""}`}
      >
        <span className="font-sans flex items-center gap-2">
          {optIcon && <span className="flex-shrink-0 w-4 text-center">{optIcon}</span>}
          {optLabel}
        </span>
        <span className="flex items-center gap-2">
          {count !== undefined && <span className={`text-xs ${isSelected ? "text-accent/70" : ""}`}>{count}</span>}
          {isSelected && <Check size={14} aria-hidden />}
        </span>
      </button>
    );
  };

  const handleToggle = () => {
    if (!isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setDropdownPos({ top: rect.bottom + 4, left: rect.left });
    }
    setIsOpen(!isOpen);
    if (isOpen) setSearchQuery("");
  };

  return (
    <div ref={containerRef} className="relative">
      <Button
        type="button"
        unstyled
        onClick={handleToggle}
        disabled={isLoading}
        aria-label={`${label}: ${value}`}
        aria-expanded={isOpen}
        aria-controls={isOpen ? dropdownId : undefined}
        className={`
          flex items-center justify-center rounded-md border transition-none
          bg-white/5 whitespace-nowrap overflow-hidden
          ${isActive ? 'border-accent shadow-[0_0_10px_rgba(212,175,55,0.2)]' : 'border-accent/20 hover:border-accent/40'}
        `}
      >
        <div className="flex items-stretch justify-center w-full min-h-[2.5rem]">
          <div className={`flex items-center justify-center border-r border-accent/10 bg-black/40 ${icon ? 'px-2.5' : 'flex-[0.35] px-3'}`}>
            {icon ? (
              <span className={isActive ? 'text-accent' : ' opacity-70'}>{icon}</span>
            ) : (
              <span className={`text-[10px] uppercase font-sans font-bold tracking-wider leading-none text-center ${isActive ? 'text-accent opacity-100' : ' opacity-70'}`}>
                {label}
              </span>
            )}
          </div>
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
          id={dropdownId}
          role="group"
          aria-label={dropdownLabel ?? label}
          className="fixed min-w-[200px] max-h-[360px] flex flex-col bg-black/95 backdrop-blur-xl border border-accent/30 rounded-md shadow-2xl"
          style={{ top: dropdownPos.top, left: dropdownPos.left, zIndex: Z_INDEX.dropdown }}
        >
          {dropdownLabel && (
            <div className="shrink-0 border-b border-accent/20 px-4 py-3 text-center text-xs font-semibold text-text-primary">
              {dropdownLabel}
            </div>
          )}
          {allOption && <div className="shrink-0 border-b border-accent/10">{renderOption(allOption)}</div>}
          {/* 검색 input */}
          {searchable && (
            <div className="shrink-0 p-2 border-b border-accent/10">
              <div className="relative">
                <Search size={14} className="absolute start-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="w-full h-8 ps-8 pe-3 bg-white/5 border border-white/10 rounded text-sm text-text-primary placeholder: focus:outline-none focus:border-accent/40"
                />
              </div>
            </div>
          )}

          {/* 옵션 리스트 */}
          <div className="overflow-y-auto flex-1">
            {listOptions.length === 0 ? (
              <div className="px-4 py-3 text-sm text-center">-</div>
            ) : (
              listOptions.map(renderOption)
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
