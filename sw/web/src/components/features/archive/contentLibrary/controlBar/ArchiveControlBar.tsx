/*
  파일명: /components/features/archive/contentLibrary/controlBar/ArchiveControlBar.tsx
  기능: 기록관 콘텐츠 라이브러리 컨트롤 바
  책임: 탭, 카테고리, 정렬 등 필터링 UI를 제공한다.
*/ // ------------------------------
"use client";

import { useState } from "react";
import { Filter, ArrowUpDown, ChevronsDown, ChevronsUp, Layers, Tag } from "lucide-react";
import Button, { SelectDropdown } from "@/components/ui/Button";
import type { CategoryWithCount } from "@/types/database";
import type { SortOption, StatusFilter } from "../useContentLibrary";
import type { ContentTypeCounts } from "@/types/content";
import type { CategoryId } from "@/constants/categories";
import { TAB_OPTIONS, STATUS_OPTIONS, SORT_OPTIONS } from "./constants";
import ControlSection from "./ControlSection";
import ControlIconButton from "./ControlIconButton";
import CategoryChip from "./CategoryChip";
import CategoryGuideModal from "./CategoryGuideModal";

function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(" ");
}

export interface ArchiveControlBarProps {
  activeTab: CategoryId;
  onTabChange: (tab: CategoryId) => void;
  typeCounts: ContentTypeCounts;
  categories: CategoryWithCount[];
  selectedCategoryId: string | null;
  onCategoryChange: (categoryId: string | null) => void;
  onManageCategories: () => void;
  statusFilter: StatusFilter;
  onStatusFilterChange: (filter: StatusFilter) => void;
  sortOption: SortOption;
  onSortOptionChange: (option: SortOption) => void;
  isAllCollapsed: boolean;
  onExpandAll: () => void;
  onCollapseAll: () => void;
}


export default function ArchiveControlBar({
  activeTab,
  onTabChange,
  typeCounts,
  categories,
  selectedCategoryId,
  onCategoryChange,
  onManageCategories,
  statusFilter,
  onStatusFilterChange,
  sortOption,
  onSortOptionChange,
  onExpandAll,
  onCollapseAll,
}: ArchiveControlBarProps) {
  const [isCategoryGuideOpen, setIsCategoryGuideOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="sticky top-0 z-30 bg-background pt-2 pb-1 sm:pt-4 sm:pb-2">
      <div className="px-2 sm:px-4 mb-3">
        <Button
          unstyled
          onClick={() => setIsExpanded(!isExpanded)}
          className={cn(
            "w-full flex items-center justify-between px-4 py-3 bg-bg-card border-2 transition-all duration-500 group relative overflow-hidden",
            isExpanded ? "border-accent shadow-glow-sm" : "border-accent-dim/20"
          )}
        >
          {/* Subtle background ornament */}
          <div className="absolute top-0 right-0 w-24 h-full bg-gradient-to-l from-accent/[0.05] to-transparent pointer-events-none" />
          
          <div className="flex items-center gap-2.5 relative z-10">
            <Filter size={16} className={cn("transition-colors duration-300", isExpanded ? "text-accent" : "text-accent-dim")} />
            <span className="font-serif font-black text-xs sm:text-sm tracking-widest text-text-primary uppercase">Filters & Sort</span>
          </div>
          
          <div className="flex items-center gap-2 relative z-10">
            <div className="h-4 w-px bg-accent/20 mx-1 hidden sm:block" />
            {isExpanded ? (
              <ChevronsUp size={16} className="text-accent animate-bounce-subtle" />
            ) : (
              <ChevronsDown size={16} className="text-text-tertiary group-hover:text-accent transition-colors" />
            )}
          </div>
        </Button>
      </div>

      {isExpanded && (
        <div className="flex flex-col md:flex-row border-2 border-double border-accent-dim/20 rounded-sm bg-bg-card/90 backdrop-blur-sm overflow-hidden shadow-lg h-auto md:min-h-[114px] animate-in slide-in-from-top-2 duration-200 divide-y md:divide-y-0 md:divide-x divide-accent-dim/20">
          {/* Section 1: Categories */}
          <ControlSection header="CONTENT TYPE" className="flex-1 border-b md:border-b-0 min-w-0">
            <div className="flex flex-col gap-3 py-1">
              {/* 대분류 - 모바일 가로 스크롤 대응 */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar mask-fade-right px-1">
                {TAB_OPTIONS.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.value;
                  const count = typeCounts[tab.type];
                  return (
                    <button
                      key={tab.value}
                      onClick={() => onTabChange(tab.value)}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 rounded-sm text-[11px] sm:text-xs font-serif font-black whitespace-nowrap border-b-2 transition-all duration-300 uppercase tracking-tighter sm:tracking-normal",
                        isActive
                          ? "border-accent text-accent bg-accent/5"
                          : "border-transparent text-text-tertiary hover:text-text-secondary hover:bg-white/5"
                      )}
                    >
                      <Icon size={12} className={cn(isActive ? "opacity-100" : "opacity-40")} />
                      <span>{tab.label}</span>
                      <span className="font-cinzel opacity-40 text-[9px] ml-1">{count}</span>
                    </button>
                  );
                })}
              </div>

              {/* 소분류 */}
              <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto no-scrollbar px-1">
                <Button
                  onClick={onManageCategories}
                  className="px-1.5 sm:px-3 py-1 text-xs sm:text-sm font-semibold text-text-tertiary hover:text-accent flex-shrink-0 rounded-lg flex items-center gap-1"
                  title="소분류 관리"
                >
                  <Tag size={12} className="sm:size-[14px]" />
                  <span className="hidden sm:inline">소분류</span>
                </Button>
                <div className="h-4 w-px bg-border/50 mx-0.5 flex-shrink-0" />
                {categories.length > 0 ? (
                  <div className="flex items-center gap-1 sm:gap-1.5">
                    <CategoryChip label="전체" isActive={selectedCategoryId === null} onClick={() => onCategoryChange(null)} />
                    {categories.map((cat) => (
                      <CategoryChip key={cat.id} label={cat.name} count={cat.content_count} isActive={selectedCategoryId === cat.id} onClick={() => onCategoryChange(cat.id)} />
                    ))}
                  </div>
                ) : (
                  <span className="text-[10px] sm:text-xs text-text-tertiary pl-1">분류 없음</span>
                )}
              </div>
            </div>
          </ControlSection>

          <div className="hidden md:block w-px bg-border/50 self-stretch" />

          {/* Section 2: Filter & Sort */}
          <div className="flex md:contents border-t md:border-t-0 border-border/50">
            <ControlSection header="정렬" className="bg-surface/10 flex-1 md:flex-none md:min-w-[150px]">
              <div className="flex md:flex-col gap-1 sm:gap-1.5 h-full justify-center">
                <SelectDropdown value={statusFilter} onChange={onStatusFilterChange} options={STATUS_OPTIONS} icon={Filter} className="h-7 sm:h-9 text-[11px] sm:text-sm" />
                <SelectDropdown value={sortOption} onChange={onSortOptionChange} options={SORT_OPTIONS} icon={ArrowUpDown} className="h-7 sm:h-9 text-[11px] sm:text-sm" />
              </div>
            </ControlSection>

            <div className="hidden md:block w-px bg-border/50 self-stretch" />

            {/* Section 3: Collapse/Expand */}
            <ControlSection header="보기" className="bg-surface/10 w-auto md:w-[80px]">
              <div className="flex md:grid md:grid-cols-2 gap-1 sm:gap-1.5">
                <ControlIconButton active={false} onClick={onExpandAll} icon={ChevronsDown} title="모두 펼치기" />
                <ControlIconButton active={false} onClick={onCollapseAll} icon={ChevronsUp} title="모두 접기" />
              </div>
            </ControlSection>
          </div>
        </div>
      )}

      <CategoryGuideModal isOpen={isCategoryGuideOpen} onClose={() => setIsCategoryGuideOpen(false)} />
    </div>
  );
}
