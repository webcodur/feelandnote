"use client";

import { GreekChevronIcon, NeoCheckIcon } from "@/components/ui/icons/neo-pantheon";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { CELEB_PROFESSION_FILTERS } from "@/constants/celebProfessions";
import { CONTENT_TYPE_FILTERS } from "@/constants/categories";
import {
  FILTER_CHIP_STYLES,
  FILTER_BOTTOMSHEET_STYLES,
} from "@/constants/filterStyles";
import { SORT_OPTIONS, type FilterType } from "./useCelebFilters";
import type { ProfessionCounts, NationalityCounts, ContentTypeCounts, CelebSortBy } from "@/actions/home";

interface CelebFiltersMobileProps {
  profession: string;
  nationality: string;
  contentType: string;
  sortBy: CelebSortBy;
  professionCounts: ProfessionCounts;
  nationalityCounts: NationalityCounts;
  contentTypeCounts: ContentTypeCounts;
  isLoading: boolean;
  activeFilter: FilterType | null;
  activeLabels: {
    profession?: { label: string };
    nationality?: { label: string };
    contentType?: { label: string };
    sort?: { label: string };
  };
  onFilterOpen: (filter: FilterType) => void;
  onFilterClose: () => void;
  onProfessionChange: (value: string) => void;
  onNationalityChange: (value: string) => void;
  onContentTypeChange: (value: string) => void;
  onSortChange: (value: CelebSortBy) => void;
}

export default function CelebFiltersMobile({
  profession,
  nationality,
  contentType,
  sortBy,
  professionCounts,
  nationalityCounts,
  contentTypeCounts,
  isLoading,
  activeFilter,
  activeLabels,
  onFilterOpen,
  onFilterClose,
  onProfessionChange,
  onNationalityChange,
  onContentTypeChange,
  onSortChange,
}: CelebFiltersMobileProps) {
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

  return (
    <>
      {/* 필터 칩들 - 가로 스크롤로 공간 절약 */}
      <div className="md:hidden mb-6 -mx-4 px-4 overflow-x-auto scrollbar-hide">
        <div className="flex items-center gap-2 min-w-max pb-1">
          <FilterChip label="직군" value={activeLabels.profession?.label ?? "전체"} isActive isLoading={isLoading} onClick={() => onFilterOpen("profession")} />
          <div className="w-px h-4 bg-accent/20 mx-1" />
          <FilterChip label="국적" value={activeLabels.nationality?.label ?? "전체"} isActive={nationality !== "all"} isLoading={isLoading} onClick={() => onFilterOpen("nationality")} />
          <div className="w-px h-4 bg-accent/20 mx-1" />
          <FilterChip label="콘텐츠" value={activeLabels.contentType?.label ?? "전체"} isActive={contentType !== "all"} isLoading={isLoading} onClick={() => onFilterOpen("contentType")} />
          <div className="w-px h-4 bg-accent/20 mx-1" />
          <FilterChip label="정렬" value={activeLabels.sort?.label ?? "영향력순"} isActive={sortBy !== "influence"} isLoading={isLoading} onClick={() => onFilterOpen("sort")} />
        </div>
      </div>

      {/* 모달들 */}
      <FilterModal title="직군" isOpen={activeFilter === "profession"} current={profession} options={professionOptions} onClose={onFilterClose} onChange={(v) => { onProfessionChange(v); onFilterClose(); }} />
      <FilterModal title="국적" isOpen={activeFilter === "nationality"} current={nationality} options={nationalityOptions} onClose={onFilterClose} onChange={(v) => { onNationalityChange(v); onFilterClose(); }} />
      <FilterModal title="콘텐츠" isOpen={activeFilter === "contentType"} current={contentType} options={contentTypeOptions} onClose={onFilterClose} onChange={(v) => { onContentTypeChange(v); onFilterClose(); }} />
      <FilterModal title="정렬" isOpen={activeFilter === "sort"} current={sortBy} options={sortOptions} onClose={onFilterClose} onChange={(v) => { onSortChange(v as CelebSortBy); onFilterClose(); }} />
    </>
  );
}

// #region 하위 컴포넌트
function FilterChip({ label, value, isActive, isLoading, onClick }: { label: string; value: string; isActive: boolean; isLoading: boolean; onClick: () => void }) {
  return (
    <Button unstyled onClick={onClick} disabled={isLoading} className={`flex items-center gap-2 ${FILTER_CHIP_STYLES.base} ${isActive ? FILTER_CHIP_STYLES.active : FILTER_CHIP_STYLES.inactive} whitespace-nowrap`}>
      <span className="text-xs opacity-80 uppercase font-cinzel tracking-wider">{label}</span>
      <span className="text-sm font-bold">{value}</span>
      <GreekChevronIcon size={14} className="opacity-60" />
    </Button>
  );
}

interface FilterOption {
  value: string;
  label: string;
  count?: number;
}

function FilterModal({ title, isOpen, current, options, onClose, onChange }: { title: string; isOpen: boolean; current: string; options: FilterOption[]; onClose: () => void; onChange: (value: string) => void }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm" closeOnOverlayClick>
      <div className="p-4 space-y-2">
        {options.map(({ value, label, count }) => {
          const isActive = current === value;
          const isDisabled = count !== undefined && count === 0;
          return (
            <Button
              key={value}
              unstyled
              onClick={() => !isDisabled && onChange(value)}
              disabled={isDisabled}
              className={`${FILTER_BOTTOMSHEET_STYLES.base} ${isActive ? FILTER_BOTTOMSHEET_STYLES.active : FILTER_BOTTOMSHEET_STYLES.inactive} ${FILTER_BOTTOMSHEET_STYLES.disabled}`}
            >
              <span className="flex-1 text-left text-sm font-medium">{label}</span>
              {count !== undefined && <span className="text-xs text-text-tertiary">{count}</span>}
              {isActive && <NeoCheckIcon size={18} />}
            </Button>
          );
        })}
      </div>
    </Modal>
  );
}
// #endregion
