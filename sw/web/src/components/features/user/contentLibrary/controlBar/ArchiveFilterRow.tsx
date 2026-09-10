"use client";

import { useState, type ReactNode } from "react";
import { LibraryBig, MessageSquareText } from "lucide-react";
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
import ArchiveSortControl from "./ArchiveSortControl";
import { REVIEW_FILTER_OPTIONS, TAB_OPTIONS } from "./constants";

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
  /** 필터 칩 줄 끝에 덧붙는 조작(전체 보기 등) */
  trailing?: ReactNode;
}

type FilterType = "category" | "review";

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
  trailing,
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
  const reviewOptions: FilterOption[] = REVIEW_FILTER_OPTIONS.map(({ value, key }) => ({
    value,
    label: t(`review.${key}`),
  }));
  const categoryLabel = tCategory(
    TAB_OPTIONS.find((tab) => tab.value === activeTab)?.value ?? "all",
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
          <ArchiveSortControl
            sortOption={sortOption}
            onSortOptionChange={onSortOptionChange}
            allowRatingSort={allowRatingSort}
            placement="desktop"
          />
        </div>

        <div className={cn(
          // trailing이 있으면 그 자리를 내주도록 w-full 대신 flex-1로 남는 폭만 채운다
          "grid flex-1 min-w-0 items-center gap-2 md:hidden",
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
          <ArchiveSortControl
            sortOption={sortOption}
            onSortOptionChange={onSortOptionChange}
            allowRatingSort={allowRatingSort}
            placement="mobile"
            className="min-w-0"
          />
        </div>

        {trailing}
      </div>

      <FilterModal title={t("filter.category")} isOpen={activeFilter === "category"} current={activeTab} options={categoryOptions} onClose={() => setActiveFilter(null)} onChange={(value) => onTabChange(value as CategoryId)} />
      {!hideReviewFilter && (
        <FilterModal title={t("filter.review")} isOpen={activeFilter === "review"} current={reviewFilter} options={reviewOptions} onClose={() => setActiveFilter(null)} onChange={(value) => onReviewFilterChange(value as ReviewFilter)} />
      )}
    </>
  );
}
