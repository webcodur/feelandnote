/*
  파일명: /components/shared/filters/FilterModal.tsx
  기능: 모바일용 필터 선택 모달
  책임: 필터 옵션을 모달 형태로 제공
*/
"use client";

import { useState, useMemo } from "react";
import { Check, Search } from "lucide-react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { FILTER_MODAL_STYLES } from "@/constants/filterStyles";
import type { FilterOption } from "./FilterChipDropdown";

interface FilterModalProps {
  title: string;
  isOpen: boolean;
  current: string;
  options: FilterOption[];
  onClose: () => void;
  onChange: (value: string) => void;
  searchable?: boolean;
  searchPlaceholder?: string;
}

export default function FilterModal({
  title,
  isOpen,
  current,
  options,
  onClose,
  onChange,
  searchable = false,
  searchPlaceholder = "",
}: FilterModalProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredOptions = useMemo(() => {
    if (!searchable || !searchQuery.trim()) return options;
    const q = searchQuery.trim().toLowerCase();
    return options.filter((opt) => opt.label.toLowerCase().includes(q));
  }, [options, searchQuery, searchable]);
  const allOption = searchable ? options.find((option) => option.value === "all") : undefined;
  const listOptions = allOption ? filteredOptions.filter((option) => option.value !== "all") : filteredOptions;

  const handleSelect = (value: string) => {
    onChange(value);
    onClose();
    setSearchQuery("");
  };

  const handleClose = () => {
    onClose();
    setSearchQuery("");
  };

  const renderOption = ({ value, label, count, icon }: FilterOption) => {
    const isActive = current === value;
    return (
      <Button
        key={value}
        type="button"
        unstyled
        onClick={() => handleSelect(value)}
        disabled={count === 0}
        aria-pressed={isActive}
        className={`${FILTER_MODAL_STYLES.base} outline-none focus-visible:ring-2 focus-visible:ring-accent ${isActive ? `${FILTER_MODAL_STYLES.active} hover:bg-accent/20` : FILTER_MODAL_STYLES.inactive} ${FILTER_MODAL_STYLES.disabled}`}
      >
        {icon && <span className="flex-shrink-0 w-5 text-center">{icon}</span>}
        <span className={`flex-1 text-left text-xs sm:text-sm font-medium ${isActive ? "font-bold" : ""}`}>{label}</span>
        {count !== undefined && <span className={`text-[10px] sm:text-xs ${isActive ? "text-accent/80" : ""}`}>{count}</span>}
        {isActive && <Check size={14} aria-hidden />}
      </Button>
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={title} titleClassName="text-center text-text-primary" size="sm" closeOnOverlayClick>
      {allOption && <div className="px-3 pt-3">{renderOption(allOption)}</div>}
      {/* 검색 input */}
      {searchable && (
        <div className="px-3 pt-3 pb-1">
          <div className="relative">
            <Search size={14} className="absolute start-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full h-9 ps-8 pe-3 bg-white/5 border border-white/10 rounded-lg text-sm text-text-primary placeholder: focus:outline-none focus:border-accent/40"
            />
          </div>
        </div>
      )}

      <div className="p-3 space-y-1.5 max-h-[60vh] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
        {listOptions.length === 0 ? (
          <div className="py-4 text-sm text-center">-</div>
        ) : (
          listOptions.map(renderOption)
        )}
      </div>
    </Modal>
  );
}
