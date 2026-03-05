/*
  파일명: /components/shared/filters/FilterModal.tsx
  기능: 모바일용 필터 선택 모달
  책임: 필터 옵션을 모달 형태로 제공
*/
"use client";

import { useState, useMemo } from "react";
import { Search } from "lucide-react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { FILTER_BOTTOMSHEET_STYLES } from "@/constants/filterStyles";
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

  const handleSelect = (value: string) => {
    onChange(value);
    onClose();
    setSearchQuery("");
  };

  const handleClose = () => {
    onClose();
    setSearchQuery("");
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={title} size="sm" closeOnOverlayClick>
      {/* 검색 input */}
      {searchable && (
        <div className="px-3 pt-3 pb-1">
          <div className="relative">
            <Search size={14} className="absolute start-2.5 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full h-9 ps-8 pe-3 bg-white/5 border border-white/10 rounded-lg text-sm text-text-primary placeholder:text-text-tertiary/60 focus:outline-none focus:border-accent/40"
            />
          </div>
        </div>
      )}

      <div className="p-3 space-y-1.5 max-h-[60vh] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
        {filteredOptions.length === 0 ? (
          <div className="py-4 text-sm text-text-tertiary text-center">-</div>
        ) : (
          filteredOptions.map(({ value, label, count, icon }) => {
            const isActive = current === value;
            const isDisabled = count !== undefined && count === 0;
            return (
              <Button
                key={value}
                type="button"
                unstyled
                onClick={() => !isDisabled && handleSelect(value)}
                disabled={isDisabled}
                className={`${FILTER_BOTTOMSHEET_STYLES.base} ${isActive ? FILTER_BOTTOMSHEET_STYLES.active : FILTER_BOTTOMSHEET_STYLES.inactive} ${FILTER_BOTTOMSHEET_STYLES.disabled}`}
              >
                {icon && <span className="flex-shrink-0 w-5 text-center">{icon}</span>}
                <span className={`flex-1 text-left text-xs sm:text-sm font-medium ${isActive ? 'font-bold' : ''}`}>{label}</span>
                {count !== undefined && <span className={`text-[10px] sm:text-xs ${isActive ? 'text-accent/80' : 'text-text-tertiary'}`}>{count}</span>}
              </Button>
            );
          })
        )}
      </div>
    </Modal>
  );
}
