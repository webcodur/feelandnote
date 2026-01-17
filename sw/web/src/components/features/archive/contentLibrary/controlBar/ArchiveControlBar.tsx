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
    <div className="sticky top-0 z-30 bg-background pt-4 pb-2">
      {/* Expander Button */}
      <Button
        unstyled
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-3 mb-2 bg-bg-card border-2 border-accent-dim/30 rounded-sm hover:border-accent hover:bg-bg-secondary transition-all duration-300 group"
      >
        <div className="flex items-center gap-2">
           <Filter size={16} className="text-accent group-hover:text-accent-hover transition-colors" />
           <span className="font-bold font-serif text-text-primary text-sm tracking-wide">Filter & Controls</span>
        </div>
        {isExpanded ? <ChevronsUp size={16} className="text-accent-dim group-hover:text-accent transition-colors" /> : <ChevronsDown size={16} className="text-text-tertiary group-hover:text-accent transition-colors" />}
      </Button>

      {isExpanded && (
        <div className="flex flex-col md:flex-row border-2 border-double border-accent-dim/20 rounded-sm bg-bg-card/90 backdrop-blur-sm overflow-hidden shadow-lg h-auto md:min-h-[114px] animate-in slide-in-from-top-2 duration-200 divide-y md:divide-y-0 md:divide-x divide-accent-dim/20">
          {/* Section 1: Categories */}
          <ControlSection header="카테고리" className="flex-1 border-b md:border-b-0 min-w-0">
            <div className="flex flex-col gap-2.5 h-full justify-center">
              {/* 대분류 */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar px-1">
                <Button
                  onClick={() => setIsCategoryGuideOpen(true)}
                  className="px-2 md:px-3 py-1.5 text-sm font-semibold text-text-tertiary hover:text-accent flex-shrink-0 rounded-lg flex items-center gap-1 md:gap-1.5"
                  title="카테고리 안내"
                >
                  <Layers size={14} />
                  <span className="hidden md:inline">대분류</span>
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
                        "flex items-center gap-1 md:gap-1.5 px-2 md:px-3 py-1.5 rounded-sm text-sm font-serif font-bold whitespace-nowrap border transition-all duration-300",
                        isActive
                          ? "bg-accent/10 border-accent text-accent shadow-[0_0_10px_rgba(212,175,55,0.2)]"
                          : "bg-transparent border-transparent text-text-secondary hover:text-text-primary hover:bg-accent/5 hover:border-accent-dim/30"
                      )}
                    >
                      <Icon size={15} strokeWidth={isActive ? 2.5 : 2} />
                      <span className="hidden md:inline">{tab.label}</span>
                      <span className="opacity-60 text-xs ml-1">({count})</span>
                    </Button>
                  );
                })}
              </div>

              {/* 소분류 */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar px-1">
                <Button
                  onClick={onManageCategories}
                  className="px-2 md:px-3 py-1.5 text-sm font-semibold text-text-tertiary hover:text-accent flex-shrink-0 rounded-lg flex items-center gap-1 md:gap-1.5"
                  title="소분류 관리"
                >
                  <Tag size={14} />
                  <span className="hidden md:inline">소분류</span>
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

          <div className="hidden md:block w-px bg-border/50 self-stretch" />

          {/* Section 2: Filter & Sort */}
          <div className="flex md:contents border-t md:border-t-0 border-border/50">
            <ControlSection header="정렬 및 필터" className="bg-surface/10 flex-1 md:flex-none md:min-w-[150px]">
              <div className="flex md:flex-col gap-1.5 h-full justify-center">
                <SelectDropdown value={statusFilter} onChange={onStatusFilterChange} options={STATUS_OPTIONS} icon={Filter} />
                <SelectDropdown value={sortOption} onChange={onSortOptionChange} options={SORT_OPTIONS} icon={ArrowUpDown} />
              </div>
            </ControlSection>

            <div className="hidden md:block w-px bg-border/50 self-stretch" />

            {/* Section 3: Collapse/Expand */}
            <ControlSection header="보기" className="bg-surface/10 w-auto md:w-[80px]">
              <div className="flex md:grid md:grid-cols-2 gap-1.5">
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
