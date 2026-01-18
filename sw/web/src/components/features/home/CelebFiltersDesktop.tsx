"use client";

import { useState, useRef, useEffect } from "react";
import Button from "@/components/ui/Button";
import { GreekChevronIcon, NeoCheckIcon } from "@/components/ui/icons/neo-pantheon";
import { CELEB_PROFESSION_FILTERS } from "@/constants/celebProfessions";
import { CONTENT_TYPE_FILTERS } from "@/constants/categories";
import { FILTER_CHIP_STYLES, FILTER_DROPDOWN_STYLES } from "@/constants/filterStyles";
import { SORT_OPTIONS, type FilterType } from "./useCelebFilters";
import type { ProfessionCounts, NationalityCounts, ContentTypeCounts, CelebSortBy } from "@/actions/home";

interface CelebFiltersDesktopProps {
  profession: string;
  nationality: string;
  contentType: string;
  sortBy: CelebSortBy;
  professionCounts: ProfessionCounts;
  nationalityCounts: NationalityCounts;
  contentTypeCounts: ContentTypeCounts;
  isLoading: boolean;
  activeLabels: {
    profession?: { label: string };
    nationality?: { label: string };
    contentType?: { label: string };
    sort?: { label: string };
  };
  onProfessionChange: (value: string) => void;
  onNationalityChange: (value: string) => void;
  onContentTypeChange: (value: string) => void;
  onSortChange: (value: CelebSortBy) => void;
}

export default function CelebFiltersDesktop({
  profession,
  nationality,
  contentType,
  sortBy,
  professionCounts,
  nationalityCounts,
  contentTypeCounts,
  isLoading,
  activeLabels,
  onProfessionChange,
  onNationalityChange,
  onContentTypeChange,
  onSortChange,
}: CelebFiltersDesktopProps) {
  const [openDropdown, setOpenDropdown] = useState<FilterType | null>(null);

  // 필터별 옵션 생성
  const professionOptions = CELEB_PROFESSION_FILTERS.map(({ value, label }) => ({
    value,
    label,
    count: professionCounts[value] ?? 0,
  }));

  const nationalityOptions = nationalityCounts.map(({ value, label, count }) => ({
    value,
    label,
    count,
  }));

  const contentTypeOptions = CONTENT_TYPE_FILTERS.map(({ value, label }) => ({
    value,
    label,
    count: contentTypeCounts[value] ?? 0,
  }));

  const sortOptions = SORT_OPTIONS.map(({ value, label }) => ({ value, label }));

  const handleDropdownToggle = (filter: FilterType) => {
    setOpenDropdown((prev) => (prev === filter ? null : filter));
  };

  const handleSelect = (filter: FilterType, value: string) => {
    if (filter === "profession") onProfessionChange(value);
    else if (filter === "nationality") onNationalityChange(value);
    else if (filter === "contentType") onContentTypeChange(value);
    else if (filter === "sort") onSortChange(value as CelebSortBy);
    setOpenDropdown(null);
  };

  return (
    <div className="hidden md:flex items-center gap-3 mb-6">
      <FilterChipDropdown
        label="직군"
        value={activeLabels.profession?.label ?? "전체"}
        isActive={profession !== "all"}
        isOpen={openDropdown === "profession"}
        isLoading={isLoading}
        options={professionOptions}
        currentValue={profession}
        onToggle={() => handleDropdownToggle("profession")}
        onSelect={(v) => handleSelect("profession", v)}
        onClose={() => setOpenDropdown(null)}
      />
      <FilterChipDropdown
        label="국적"
        value={activeLabels.nationality?.label ?? "전체"}
        isActive={nationality !== "all"}
        isOpen={openDropdown === "nationality"}
        isLoading={isLoading}
        options={nationalityOptions}
        currentValue={nationality}
        onToggle={() => handleDropdownToggle("nationality")}
        onSelect={(v) => handleSelect("nationality", v)}
        onClose={() => setOpenDropdown(null)}
      />
      <FilterChipDropdown
        label="콘텐츠"
        value={activeLabels.contentType?.label ?? "전체"}
        isActive={contentType !== "all"}
        isOpen={openDropdown === "contentType"}
        isLoading={isLoading}
        options={contentTypeOptions}
        currentValue={contentType}
        onToggle={() => handleDropdownToggle("contentType")}
        onSelect={(v) => handleSelect("contentType", v)}
        onClose={() => setOpenDropdown(null)}
      />
      <FilterChipDropdown
        label="정렬"
        value={activeLabels.sort?.label ?? "영향력순"}
        isActive={sortBy !== "influence"}
        isOpen={openDropdown === "sort"}
        isLoading={isLoading}
        options={sortOptions}
        currentValue={sortBy}
        onToggle={() => handleDropdownToggle("sort")}
        onSelect={(v) => handleSelect("sort", v)}
        onClose={() => setOpenDropdown(null)}
      />
    </div>
  );
}

// #region 하위 컴포넌트
interface FilterOption {
  value: string;
  label: string;
  count?: number;
}

interface FilterChipDropdownProps {
  label: string;
  value: string;
  isActive: boolean;
  isOpen: boolean;
  isLoading: boolean;
  options: FilterOption[];
  currentValue: string;
  onToggle: () => void;
  onSelect: (value: string) => void;
  onClose: () => void;
}

function FilterChipDropdown({
  label,
  value,
  isActive,
  isOpen,
  isLoading,
  options,
  currentValue,
  onToggle,
  onSelect,
  onClose,
}: FilterChipDropdownProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // 외부 클릭 시 닫기
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose]);

  return (
    <div ref={containerRef} className="relative">
      <Button
        unstyled
        onClick={onToggle}
        disabled={isLoading}
        className={`flex items-center gap-2 ${FILTER_CHIP_STYLES.base} ${isActive ? FILTER_CHIP_STYLES.active : FILTER_CHIP_STYLES.inactive} whitespace-nowrap`}
      >
        <span className="text-xs opacity-80 uppercase font-cinzel tracking-wider">{label}</span>
        <span className="text-sm font-bold">{value}</span>
        <GreekChevronIcon size={14} className={`opacity-60 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </Button>

      {isOpen && (
        <div className={FILTER_DROPDOWN_STYLES.container}>
          {options.map(({ value: optValue, label: optLabel, count }) => {
            const isSelected = currentValue === optValue;
            const isDisabled = count !== undefined && count === 0;

            return (
              <button
                key={optValue}
                onClick={() => !isDisabled && onSelect(optValue)}
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
// #endregion
