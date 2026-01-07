/*
  파일명: /components/features/archive/contentLibrary/controlBar/ArchiveControlBar.tsx
  기능: 기록관 콘텐츠 라이브러리 컨트롤 바
  책임: 탭, 카테고리, 진행도 필터, 정렬, 뷰 모드 등 필터링 UI를 제공한다.
*/ // ------------------------------
"use client";

import { useState } from "react";
import { LayoutGrid, List, Filter, ArrowUpDown, ChevronsDown, ChevronsUp, Layers, Tag } from "lucide-react";
import Button, { SelectDropdown } from "@/components/ui/Button";
import type { CategoryWithCount } from "@/types/database";
import type { ProgressFilter, SortOption, ViewMode } from "../useContentLibrary";
import type { ContentTypeCounts } from "@/actions/contents/getContentCounts";
import { TAB_OPTIONS, PROGRESS_OPTIONS, SORT_OPTIONS } from "./constants";
import ControlSection from "./components/ControlSection";
import ControlIconButton from "./components/ControlIconButton";
import CategoryChip from "./components/CategoryChip";
import CategoryGuideModal from "./CategoryGuideModal";

function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(" ");
}

interface ArchiveControlBarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  typeCounts: ContentTypeCounts;
  categories: CategoryWithCount[];
  selectedCategoryId: string | null;
  onCategoryChange: (categoryId: string | null) => void;
  onManageCategories: () => void;
  progressFilter: ProgressFilter;
  onProgressFilterChange: (filter: ProgressFilter) => void;
  sortOption: SortOption;
  onSortOptionChange: (option: SortOption) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  isAllCollapsed: boolean;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  customActions?: React.ReactNode;
}

export default function ArchiveControlBar({
  activeTab,
  onTabChange,
  typeCounts,
  categories,
  selectedCategoryId,
  onCategoryChange,
  onManageCategories,
  progressFilter,
  onProgressFilterChange,
  sortOption,
  onSortOptionChange,
  viewMode,
  onViewModeChange,
  onExpandAll,
  onCollapseAll,
  customActions,
}: ArchiveControlBarProps) {
  const [isCategoryGuideOpen, setIsCategoryGuideOpen] = useState(false);

  return (
    <div className="sticky top-0 z-30 bg-background pt-4 pb-2">
      <div className="flex flex-col sm:flex-row border border-border rounded-xl bg-surface/20 overflow-hidden shadow-sm h-auto sm:min-h-[114px]">
        {/* Section 1: Categories */}
        <ControlSection header="카테고리" className="flex-1 border-b sm:border-b-0 min-w-0">
          <div className="flex flex-col gap-2.5 h-full justify-center">
            {/* 대분류 */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar px-1">
              <Button
                onClick={() => setIsCategoryGuideOpen(true)}
                className="px-3 py-1.5 text-sm font-semibold text-text-tertiary hover:text-accent flex-shrink-0 rounded-lg flex items-center gap-1.5"
                title="카테고리 안내"
              >
                <Layers size={14} />
                대분류
              </Button>
              <div className="h-5 w-px bg-border/50 mx-0.5 flex-shrink-0" />
              {TAB_OPTIONS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.value;
                const count = typeCounts[tab.type];
                return (
                  <Button
                    key={tab.value}
                    onClick={() => onTabChange(tab.value)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold whitespace-nowrap border",
                      isActive
                        ? "bg-accent/10 border-accent/20 text-accent shadow-sm"
                        : "bg-surface border-transparent text-text-secondary hover:bg-surface-hover hover:text-text-primary"
                    )}
                  >
                    <Icon size={15} strokeWidth={isActive ? 2.5 : 2} />
                    <span>{tab.label}</span>
                    <span className="opacity-60">({count})</span>
                  </Button>
                );
              })}
            </div>

            {/* 소분류 */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar px-1">
              <Button
                onClick={onManageCategories}
                className="px-3 py-1.5 text-sm font-semibold text-text-tertiary hover:text-accent flex-shrink-0 rounded-lg flex items-center gap-1.5"
                title="소분류 관리"
              >
                <Tag size={14} />
                소분류
              </Button>
              <div className="h-5 w-px bg-border/50 mx-0.5 flex-shrink-0" />
              {categories.length > 0 ? (
                <div className="flex items-center gap-1.5">
                  <CategoryChip label="전체" isActive={selectedCategoryId === null} onClick={() => onCategoryChange(null)} />
                  {categories.map((cat) => (
                    <CategoryChip key={cat.id} label={cat.name} count={cat.content_count} isActive={selectedCategoryId === cat.id} onClick={() => onCategoryChange(cat.id)} />
                  ))}
                </div>
              ) : (
                <span className="text-xs text-text-tertiary pl-1">등록된 분류가 없습니다</span>
              )}
            </div>
          </div>
        </ControlSection>

        <div className="hidden sm:block w-px bg-border/50 self-stretch" />

        {/* Section 2: Filter */}
        <ControlSection header="정렬 및 필터" className="bg-surface/10 min-w-[150px]">
          <div className="flex flex-col gap-1.5 h-full justify-center">
            <SelectDropdown value={progressFilter} onChange={onProgressFilterChange} options={PROGRESS_OPTIONS} icon={Filter} />
            <SelectDropdown value={sortOption} onChange={onSortOptionChange} options={SORT_OPTIONS} icon={ArrowUpDown} />
          </div>
        </ControlSection>

        <div className="hidden sm:block w-px bg-border/50 self-stretch" />

        {/* Section 3: View */}
        <ControlSection header="보기" className="bg-surface/10 w-[90px] sm:w-[90px]">
          <div className="grid grid-cols-2 gap-1.5">
            <ControlIconButton active={viewMode === "grid"} onClick={() => onViewModeChange("grid")} icon={LayoutGrid} title="그리드 뷰" />
            <ControlIconButton active={viewMode === "list"} onClick={() => onViewModeChange("list")} icon={List} title="리스트 뷰" />
            <ControlIconButton active={false} onClick={onExpandAll} icon={ChevronsDown} title="모두 펼치기" />
            <ControlIconButton active={false} onClick={onCollapseAll} icon={ChevronsUp} title="모두 접기" />
          </div>
        </ControlSection>

        {/* Section 4: Actions */}
        {customActions && (
          <>
            <div className="hidden sm:block w-px bg-border/50 self-stretch" />
            <ControlSection header="액션" className="bg-surface/10 w-[90px] sm:w-[90px]">
              {customActions}
            </ControlSection>
          </>
        )}
      </div>

      <CategoryGuideModal isOpen={isCategoryGuideOpen} onClose={() => setIsCategoryGuideOpen(false)} />
    </div>
  );
}
