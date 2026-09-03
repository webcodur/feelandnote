"use client";

import { useState } from "react";
import { ArrowUpDown, LibraryBig, MessageSquareText } from "lucide-react";
import { useTranslations } from "next-intl";

import FilterChip from "@/components/shared/filters/FilterChip";
import FilterChipDropdown, {
  type FilterOption,
} from "@/components/shared/filters/FilterChipDropdown";
import FilterModal from "@/components/shared/filters/FilterModal";
import type { CategoryId } from "@/constants/categories";
import { cn } from "@/lib/utils";
import type { ContentTypeCounts } from "@/types/content";

import type { ReviewFilter, SortOption } from "../contentLibraryTypes";
import { REVIEW_FILTER_OPTIONS, SORT_OPTIONS, TAB_OPTIONS } from "./constants";

interface ArchiveFilterRowProps {
  activeTab: CategoryId;
  onTabChange: (tab: CategoryId) => void;
  typeCounts: ContentTypeCounts | null;
  sortOption: SortOption;
  onSortOptionChange: (option: SortOption) => void;
  reviewFilter: ReviewFilter;
  onReviewFilterChange: (filter: ReviewFilter) => void;
  allowRatingSort?: boolean;
  /** 셀럽 서가는 감상에 리뷰가 항상 붙어 리뷰 필터를 숨긴다 */
  hideReviewFilter?: boolean;
  compact: boolean;
}

type FilterType = "category" | "sort" | "review";

export default function ArchiveFilterRow({
  activeTab,
  onTabChange,
  typeCounts,
  sortOption,
  onSortOptionChange,
  reviewFilter,
  onReviewFilterChange,
  allowRatingSort = true,
  hideReviewFilter = false,
  compact,
}: ArchiveFilterRowProps) {
  const t = useTranslations("archiveSearch");
  const tCategory = useTranslations("content.category");
  const [activeFilter, setActiveFilter] = useState<FilterType | null>(null);
  const totalCount = typeCounts
    ? Object.values(typeCounts).reduce((sum, count) => sum + count, 0)
    : undefined;
  // 카테고리는 아이콘+숫자로 고른다. 아이콘은 드롭다운과 모바일 모달 양쪽에 뜬다.
  const categoryOptions: FilterOption[] = TAB_OPTIONS.map((tab) => {
    const Icon = tab.icon;
    return {
      value: tab.value,
      label: tCategory(tab.value),
      icon: <Icon size={14} aria-hidden />,
      count: typeCounts
        ? tab.type
          ? typeCounts[tab.type]
          : totalCount
        : undefined,
    };
  });
  const availableSortOptions = allowRatingSort
    ? SORT_OPTIONS
    : SORT_OPTIONS.filter(({ value }) => value !== "rating_desc" && value !== "rating_asc");
  const sortOptions: FilterOption[] = availableSortOptions.map(({ value, key }) => ({
    value,
    label: t(`sort.${key}`),
  }));
  const reviewOptions: FilterOption[] = REVIEW_FILTER_OPTIONS.map(({ value, key }) => ({
    value,
    label: t(`review.${key}`),
  }));
  const categoryLabel = tCategory(
    TAB_OPTIONS.find((tab) => tab.value === activeTab)?.value ?? "all",
  );
  const sortLabel = t(
    `sort.${availableSortOptions.find((option) => option.value === sortOption)?.key ?? "recent"}`,
  );
  const reviewLabel = t(
    `review.${REVIEW_FILTER_OPTIONS.find((option) => option.value === reviewFilter)?.key ?? "all"}`,
  );

  return (
    <>
      <div className={cn(
        "flex items-center justify-center gap-2",
        compact ? "px-2 py-2" : "min-h-[4.5rem] px-6 py-4",
      )}>
        <div className="hidden items-center gap-2 md:flex">
          <FilterChipDropdown
            label={t("filter.category")}
            value={categoryLabel}
            icon={<LibraryBig size={18} strokeWidth={1.7} aria-hidden />}
            isActive
            options={categoryOptions}
            currentValue={activeTab}
            onSelect={(value) => onTabChange(value as CategoryId)}
          />
          {!hideReviewFilter && (
            <FilterChipDropdown
              label={t("filter.review")}
              value={reviewLabel}
              icon={<MessageSquareText size={18} strokeWidth={1.7} aria-hidden />}
              isActive={reviewFilter !== "all"}
              options={reviewOptions}
              currentValue={reviewFilter}
              onSelect={(value) => onReviewFilterChange(value as ReviewFilter)}
            />
          )}
          <FilterChipDropdown
            label={t("filter.sort")}
            value={sortLabel}
            icon={<ArrowUpDown size={18} strokeWidth={1.7} aria-hidden />}
            isActive={sortOption !== "recent"}
            options={sortOptions}
            currentValue={sortOption}
            onSelect={(value) => onSortOptionChange(value as SortOption)}
          />
        </div>

        <div className={cn(
          "grid w-full min-w-0 items-center gap-2 md:hidden",
          hideReviewFilter ? "grid-cols-2" : "grid-cols-3",
        )}>
          <FilterChip
            label={t("filter.category")}
            value={categoryLabel}
            icon={<LibraryBig size={16} strokeWidth={1.7} aria-hidden />}
            isActive
            onClick={() => setActiveFilter("category")}
            className="min-w-0"
          />
          {!hideReviewFilter && (
            <FilterChip
              label={t("filter.review")}
              value={reviewLabel}
              icon={<MessageSquareText size={16} strokeWidth={1.7} aria-hidden />}
              isActive={reviewFilter !== "all"}
              onClick={() => setActiveFilter("review")}
              className="min-w-0"
            />
          )}
          <FilterChip
            label={t("filter.sort")}
            value={sortLabel}
            icon={<ArrowUpDown size={16} strokeWidth={1.7} aria-hidden />}
            isActive={sortOption !== "recent"}
            onClick={() => setActiveFilter("sort")}
            className="min-w-0"
          />
        </div>
      </div>

      <FilterModal title={t("filter.category")} isOpen={activeFilter === "category"} current={activeTab} options={categoryOptions} onClose={() => setActiveFilter(null)} onChange={(value) => onTabChange(value as CategoryId)} />
      {!hideReviewFilter && (
        <FilterModal title={t("filter.review")} isOpen={activeFilter === "review"} current={reviewFilter} options={reviewOptions} onClose={() => setActiveFilter(null)} onChange={(value) => onReviewFilterChange(value as ReviewFilter)} />
      )}
      <FilterModal title={t("filter.sort")} isOpen={activeFilter === "sort"} current={sortOption} options={sortOptions} onClose={() => setActiveFilter(null)} onChange={(value) => onSortOptionChange(value as SortOption)} />
    </>
  );
}
