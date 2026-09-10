"use client";

import { useState } from "react";
import { ArrowUpDown } from "lucide-react";
import { useTranslations } from "next-intl";

import FilterChip from "@/components/shared/filters/FilterChip";
import FilterChipDropdown, {
  type FilterOption,
} from "@/components/shared/filters/FilterChipDropdown";
import FilterModal from "@/components/shared/filters/FilterModal";
import { cn } from "@/lib/utils";

import type { SortOption } from "../contentLibraryTypes";
import { SORT_OPTIONS } from "./constants";

type SortControlPlacement = "desktop" | "mobile" | "responsive";

interface ArchiveSortControlProps {
  sortOption: SortOption;
  onSortOptionChange: (option: SortOption) => void;
  allowRatingSort?: boolean;
  placement?: SortControlPlacement;
  className?: string;
}

export default function ArchiveSortControl({
  sortOption,
  onSortOptionChange,
  allowRatingSort = true,
  placement = "responsive",
  className = "",
}: ArchiveSortControlProps) {
  const t = useTranslations("archiveSearch");
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const availableSortOptions = allowRatingSort
    ? SORT_OPTIONS
    : SORT_OPTIONS.filter(({ value }) => value !== "rating_desc" && value !== "rating_asc");
  const sortOptions: FilterOption[] = availableSortOptions.map(({ value, key }) => ({
    value,
    label: t(`sort.${key}`),
  }));
  const sortLabel = t(
    `sort.${availableSortOptions.find((option) => option.value === sortOption)?.key ?? "recent"}`,
  );
  const isActive = sortOption !== "recent";
  const showDesktop = placement !== "mobile";
  const showMobile = placement !== "desktop";
  const responsiveDesktopClass = placement === "responsive" ? "hidden md:flex" : "flex";
  const responsiveMobileClass = placement === "responsive" ? "md:hidden" : "";

  const handleSelect = (value: string) => {
    onSortOptionChange(value as SortOption);
    setIsMobileOpen(false);
  };

  return (
    <>
      {showDesktop && (
        <div className={cn(responsiveDesktopClass, "items-center")}>
          <FilterChipDropdown
            label={t("filter.sort")}
            value={sortLabel}
            icon={<ArrowUpDown size={18} strokeWidth={1.7} aria-hidden />}
            isActive={isActive}
            options={sortOptions}
            currentValue={sortOption}
            onSelect={handleSelect}
          />
        </div>
      )}

      {showMobile && (
        <div className={cn(responsiveMobileClass, "min-w-0", className)}>
          <FilterChip
            label={t("filter.sort")}
            value={sortLabel}
            icon={<ArrowUpDown size={16} strokeWidth={1.7} aria-hidden />}
            isActive={isActive}
            onClick={() => setIsMobileOpen(true)}
            className="min-w-0"
          />
        </div>
      )}

      {showMobile && (
        <FilterModal
          title={t("filter.sort")}
          isOpen={isMobileOpen}
          current={sortOption}
          options={sortOptions}
          onClose={() => setIsMobileOpen(false)}
          onChange={handleSelect}
        />
      )}
    </>
  );
}
