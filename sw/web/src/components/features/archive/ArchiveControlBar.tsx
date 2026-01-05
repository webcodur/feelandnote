"use client";

import { useState } from "react";
import {
  LayoutGrid,
  List,
  Filter,
  ArrowUpDown,
  ChevronsDown,
  ChevronsUp,
  Layers,
  Tag,
  LucideIcon,
} from "lucide-react";
import Button, { IconButton, SelectDropdown } from "@/components/ui/Button";
import Modal, { ModalBody } from "@/components/ui/Modal";
import { CATEGORIES } from "@/constants/categories";
import type { ContentType, CategoryWithCount } from "@/types/database";
import type { ProgressFilter, SortOption, ViewMode } from "./hooks/useContentLibrary";
import type { ContentTypeCounts } from "@/actions/contents/getContentCounts";

// #region Utils
function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(" ");
}
// #endregion

// #region Constants
export const TAB_OPTIONS = CATEGORIES.map((cat) => ({
  value: cat.id,
  label: cat.label,
  icon: cat.icon,
  type: cat.dbType as ContentType,
}));

const PROGRESS_OPTIONS: { value: ProgressFilter; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "not_started", label: "시작 전" },
  { value: "in_progress", label: "진행 중" },
  { value: "completed", label: "완료" },
];

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "recent", label: "최근 추가" },
  { value: "title", label: "이름순" },
  { value: "progress_desc", label: "진행도 높음" },
  { value: "progress_asc", label: "진행도 낮음" },
];
// #endregion

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
  isAllCollapsed,
  onExpandAll,
  onCollapseAll,
  customActions,
}: ArchiveControlBarProps) {
  const [isCategoryGuideOpen, setIsCategoryGuideOpen] = useState(false);

  return (
    <div className="sticky top-0 z-30 bg-background pt-4 pb-2">
      {/* sm:h-[110px] -> min-h-[114px] to prevent cutoff and allow expansion if needed */}
      <div className="flex flex-col sm:flex-row border border-border rounded-xl bg-surface/20 overflow-hidden shadow-sm h-auto sm:min-h-[114px]">
        
        {/* Section 1: Categories (Main Content) - Flex Grow */}
        <ControlSection header="카테고리" className="flex-1 border-b sm:border-b-0 sm:border-r border-border/50 min-w-0">
          <div className="flex flex-col gap-2.5 h-full justify-center">
            {/* Top Row: 대분류 */}
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

            {/* Bottom Row: 소분류 */}
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
                  <CategoryChip
                    label="전체"
                    isActive={selectedCategoryId === null}
                    onClick={() => onCategoryChange(null)}
                  />
                  {categories.map((cat) => (
                    <CategoryChip
                      key={cat.id}
                      label={cat.name}
                      count={cat.content_count}
                      isActive={selectedCategoryId === cat.id}
                      onClick={() => onCategoryChange(cat.id)}
                    />
                  ))}
                </div>
              ) : (
                <span className="text-xs text-text-tertiary pl-1">등록된 분류가 없습니다</span>
              )}
            </div>
          </div>
        </ControlSection>

        {/* Section 2: Filter */}
        <ControlSection header="정렬 및 필터" className="border-r border-border/50 bg-surface/10 min-w-[150px]">
          <div className="flex flex-col gap-1.5 h-full justify-center">
            <SelectDropdown
              value={progressFilter}
              onChange={onProgressFilterChange}
              options={PROGRESS_OPTIONS}
              icon={Filter}
            />
            <SelectDropdown
              value={sortOption}
              onChange={onSortOptionChange}
              options={SORT_OPTIONS}
              icon={ArrowUpDown}
            />
          </div>
        </ControlSection>

        {/* Section 3: View - 2x2 Grid */}
        <ControlSection header="보기" className="border-r border-border/50 bg-surface/10 w-[90px] sm:w-[90px]">
          <div className="grid grid-cols-2 gap-1.5">
            <ViewToggleButton
              active={viewMode === "grid"}
              onClick={() => onViewModeChange("grid")}
              icon={LayoutGrid}
              title="그리드 뷰"
            />
            <ViewToggleButton
              active={viewMode === "list"}
              onClick={() => onViewModeChange("list")}
              icon={List}
              title="리스트 뷰"
            />
            <ViewToggleButton
              active={false}
              onClick={onExpandAll}
              icon={ChevronsDown}
              title="모두 펼치기"
            />
            <ViewToggleButton
              active={false}
              onClick={onCollapseAll}
              icon={ChevronsUp}
              title="모두 접기"
            />
          </div>
        </ControlSection>

        {/* Section 4: Actions */}
        {customActions && (
          <ControlSection header="액션" className="bg-surface/10 w-full sm:w-auto min-w-[120px]">
             <div className="flex items-center justify-center h-full px-2">
              {customActions}
            </div>
          </ControlSection>
        )}
      </div>

      {/* 대분류 안내 모달 */}
      <Modal
        isOpen={isCategoryGuideOpen}
        onClose={() => setIsCategoryGuideOpen(false)}
        title="대분류 안내"
        size="sm"
        closeOnOverlayClick
      >
        <ModalBody>
          <div className="flex flex-col gap-4 text-sm text-text-secondary leading-relaxed">
            <p>
              대분류는 콘텐츠의 <span className="text-text-primary font-medium">매체 유형</span>을
              기준으로 구분됩니다.
            </p>
            <p>
              현재 도서, 영상, 게임, 음악, 자격증 총 5개의 대분류가 제공되고 있으며,
              사용자분들의 건의에 따라 새로운 카테고리가 추가될 수 있습니다. (외부 API가 확인되는 경우 추가 가능)
            </p>
            
            <p className="text-text-tertiary text-xs">
              카테고리 추가 건의는 자유게시판에서 건의사항 태그를 붙여주시면 전달됩니다.
            </p>
          </div>
        </ModalBody>
      </Modal>
    </div>
  );
}

// #region Helper Components
function ControlSection({ header, children, className }: { header: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col h-full", className)}>
      <div className="w-full py-2 bg-surface/30 border-b border-border/40 text-center">
        <span className="text-sm font-semibold text-text-secondary select-none">
          {header}
        </span>
      </div>
      <div className="flex-1 w-full p-3 flex flex-col justify-center">
        {children}
      </div>
    </div>
  );
}

function CategoryChip({ label, count, isActive, onClick }: { label: string; count?: number; isActive: boolean; onClick: () => void }) {
  return (
    <Button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-semibold whitespace-nowrap border",
        isActive
          ? "bg-accent/10 border-accent/20 text-accent shadow-sm"
          : "bg-surface border-transparent text-text-secondary hover:bg-surface-hover hover:text-text-primary"
      )}
    >
      {label}
      {count !== undefined && <span className="opacity-60">({count})</span>}
    </Button>
  );
}

function ViewToggleButton({ active, onClick, icon, title }: { active: boolean; onClick: () => void; icon: LucideIcon, title?: string }) {
  return (
    <IconButton
      icon={icon}
      size={14}
      active={active}
      onClick={onClick}
      title={title}
      className={cn(
        "w-full h-8 rounded-lg border",
        active
          ? "bg-accent/10 border-accent/20 text-accent"
          : "bg-surface/50 border-border/40 text-text-tertiary hover:bg-surface-hover hover:border-border hover:text-text-primary"
      )}
    />
  );
}
// #endregion
