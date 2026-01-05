/*
  파일명: /components/features/archive/ContentLibrary.tsx
  기능: 사용자의 콘텐츠 라이브러리 메인 컴포넌트
  책임: 콘텐츠 목록 표시, 필터링, 정렬, 분류 관리 UI를 제공한다.
*/ // ------------------------------
"use client";

import { useState, useEffect } from "react";

import { useContentLibrary } from "./hooks/useContentLibrary";
import ArchiveControlBar, { TAB_OPTIONS } from "./ArchiveControlBar";
import MonthSection from "./MonthSection";
import ContentItemRenderer from "./ContentItemRenderer";
import { LoadingState, ErrorState, EmptyState } from "./ContentLibraryStates";
import CategoryManager from "./CategoryManager";
import BatchActionBar from "./BatchActionBar";
import PinnedCorkBoard from "./PinnedCorkBoard";
import { Pagination } from "@/components/ui";
import MonthTransitionIndicator from "./MonthTransitionIndicator";
import { Pin, X } from "lucide-react";

import { batchRemoveContents } from "@/actions/contents";
import { moveToCategory } from "@/actions/categories/moveToCategory";

import type { UserContentWithContent } from "@/actions/contents/getMyContents";

// #region 타입
export interface HeaderActionsProps {
  toggleBatchMode: () => void;
  isBatchMode: boolean;
  enterPinMode: () => void;
  isPinMode: boolean;
}

interface ContentLibraryProps {
  compact?: boolean;
  maxItems?: number;
  showTabs?: boolean;
  showFilters?: boolean;
  showViewToggle?: boolean;
  showCategories?: boolean;
  showPagination?: boolean;
  emptyMessage?: string;
  headerActions?: React.ReactNode | ((props: HeaderActionsProps) => React.ReactNode);
}
// #endregion

export default function ContentLibrary({
  compact = false,
  maxItems,
  showTabs = true,
  showFilters = true,
  showViewToggle = true,
  showCategories = true,
  showPagination = true,
  emptyMessage = "아직 기록한 콘텐츠가 없습니다",
  headerActions,
}: ContentLibraryProps) {
  // #region 훅
  const lib = useContentLibrary({ maxItems, compact, showCategories });
  const [isBatchLoading, setIsBatchLoading] = useState(false);
  // #endregion

  // #region 배치 모드 핸들러
  const handleBatchDelete = async () => {
    if (lib.selectedIds.size === 0) return;
    if (!confirm(`${lib.selectedIds.size}개 콘텐츠를 삭제하시겠습니까?`)) return;

    setIsBatchLoading(true);
    try {
      await batchRemoveContents({ userContentIds: [...lib.selectedIds] });
      lib.toggleBatchMode();
      lib.loadContents();
    } catch (err) {
      console.error("일괄 삭제 실패:", err);
      alert("일괄 삭제에 실패했습니다.");
    } finally {
      setIsBatchLoading(false);
    }
  };

  const handleBatchCategoryChange = async (categoryId: string | null) => {
    if (lib.selectedIds.size === 0) return;

    setIsBatchLoading(true);
    try {
      await moveToCategory({ userContentIds: [...lib.selectedIds], categoryId });
      lib.toggleBatchMode();
      lib.loadContents();
      lib.loadCategories();
    } catch (err) {
      console.error("일괄 분류 이동 실패:", err);
      alert("일괄 분류 이동에 실패했습니다.");
    } finally {
      setIsBatchLoading(false);
    }
  };
  // #endregion

  // #region 헬퍼 함수
  const renderItems = (items: UserContentWithContent[]) => (
    <ContentItemRenderer
      items={items}
      viewMode={lib.viewMode}
      compact={compact}
      categories={lib.currentTypeCategories}
      onProgressChange={lib.handleProgressChange}
      onStatusChange={lib.handleStatusChange}
      onRecommendChange={lib.handleRecommendChange}
      onDateChange={lib.handleDateChange}
      onCategoryChange={lib.handleMoveToCategory}
      onDelete={lib.handleDelete}
      isBatchMode={lib.isBatchMode}
      selectedIds={lib.selectedIds}
      onToggleSelect={lib.toggleSelect}
      isPinMode={lib.isPinMode}
      onPinToggle={lib.handlePinToggle}
    />
  );

  const handleCategoryManage = () => {
    const tab = TAB_OPTIONS.find((t) => t.value === lib.activeTab);
    if (tab?.type) lib.setCategoryManagerType(tab.type);
  };
  // #endregion

  // #region 렌더링 - 상태
  const hasContents = lib.contents.length > 0;
  const hasFilteredContents = lib.filteredAndSortedContents.length > 0;

  const renderStates = () => {
    if (lib.error) return <ErrorState message={lib.error} onRetry={lib.loadContents} compact={compact} />;
    if (lib.isLoading) return <LoadingState compact={compact} />;
    if (!hasContents) return <EmptyState message={emptyMessage} compact={compact} />;
    if (!hasFilteredContents) return <EmptyState message="필터 조건에 맞는 콘텐츠가 없습니다" compact={compact} />;
    return null;
  };
  // #endregion

  // #region 렌더링 - 월별 콘텐츠
  const renderMonthlyContent = () => (
    <div className="space-y-0">
      {lib.monthKeys.map((monthKey) => {
        const items = lib.groupedByMonth[monthKey] || [];
        return (
          <MonthSection
            key={monthKey}
            monthKey={monthKey}
            label={lib.formatMonthLabel(monthKey)}
            itemCount={items.length}
            isCollapsed={lib.collapsedMonths.has(monthKey)}
            onToggle={() => lib.toggleMonth(monthKey)}
          >
            {renderItems(items)}
          </MonthSection>
        );
      })}
    </div>
  );
  // #endregion

  // #region 스크롤 감지
  const [currentVisibleMonth, setCurrentVisibleMonth] = useState<string | null>(null);

  useEffect(() => {
    // 월별 섹션 관찰
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = entry.target.id;
            if (id.startsWith("month-section-")) {
              const monthKey = id.replace("month-section-", "");
              setCurrentVisibleMonth(monthKey);
            }
          }
        });
      },
      {
        root: null,
        rootMargin: "-20% 0px -60% 0px", // 화면 상단 20% ~ 40% 지점에서 교차 감지
        threshold: 0,
      }
    );

    const sections = document.querySelectorAll("[id^='month-section-']");
    sections.forEach((section) => observer.observe(section));

    return () => observer.disconnect();
  }, [lib.monthKeys, lib.collapsedMonths]); // 섹션이 변경되거나 펼쳐질 때 재설정
  // #endregion

  // #region ESC 키 핸들러
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (lib.isBatchMode) lib.toggleBatchMode();
        if (lib.isPinMode) lib.exitPinMode();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [lib.isBatchMode, lib.isPinMode, lib.toggleBatchMode, lib.exitPinMode]);
  // #endregion

  // #region 렌더링
  return (
    <div>
      <MonthTransitionIndicator currentMonthKey={currentVisibleMonth} />

      {/* Unified Archive Control Bar */}
      <div className={compact ? "mb-3" : "mb-2"}>
        <ArchiveControlBar
          // Main Tabs
          activeTab={lib.activeTab}
          onTabChange={lib.setActiveTab}
          typeCounts={lib.typeCounts}

          // Category Chips
          categories={showCategories ? lib.currentTypeCategories : []}
          selectedCategoryId={lib.selectedCategoryId}
          onCategoryChange={lib.setSelectedCategoryId}
          onManageCategories={handleCategoryManage}

          // Filters & Controls
          progressFilter={lib.progressFilter}
          onProgressFilterChange={lib.setProgressFilter}
          
          sortOption={lib.sortOption}
          onSortOptionChange={lib.setSortOption}
          
          viewMode={lib.viewMode}
          onViewModeChange={lib.setViewMode}
          
          // Expand/Collapse
          isAllCollapsed={lib.isAllCollapsed}
          onExpandAll={lib.expandAll}
          onCollapseAll={lib.collapseAll}
          customActions={
            typeof headerActions === "function"
              ? headerActions({
                  toggleBatchMode: lib.toggleBatchMode,
                  isBatchMode: lib.isBatchMode,
                  enterPinMode: lib.enterPinMode,
                  isPinMode: lib.isPinMode,
                })
              : headerActions
          }
        />
      </div>

      <div>
        {/* 상태 표시 (로딩, 에러, 빈 상태) */}
        {renderStates()}

        {/* 코르크 보드 (핀된 콘텐츠) */}
        {!lib.isLoading && !lib.error && (lib.pinnedContents.length > 0 || lib.isPinMode) && (
          <PinnedCorkBoard
            items={lib.pinnedContents}
            isPinMode={lib.isPinMode}
            onUnpin={lib.handlePinToggle}
          />
        )}

        {/* 콘텐츠 목록 (월별) */}
        {!lib.isLoading && !lib.error && hasFilteredContents && renderMonthlyContent()}

        {/* 페이지네이션 */}
        {!compact && showPagination && !lib.isLoading && lib.totalPages > 1 && (
          <div className="mt-6 flex justify-center">
            <Pagination currentPage={lib.currentPage} totalPages={lib.totalPages} onPageChange={lib.setCurrentPage} />
          </div>
        )}
      </div>

      {/* 분류 관리 모달 */}
      {lib.categoryManagerType && (
        <CategoryManager
          contentType={lib.categoryManagerType}
          categories={lib.categories[lib.categoryManagerType] || []}
          onCategoriesChange={() => { lib.loadCategories(); lib.loadContents(); }}
          onClose={() => lib.setCategoryManagerType(null)}
        />
      )}

      {/* 배치 모드 액션 바 */}
      {lib.isBatchMode && (
        <BatchActionBar
          selectedCount={lib.selectedIds.size}
          totalCount={lib.filteredAndSortedContents.length}
          onDelete={handleBatchDelete}
          onCategoryChange={handleBatchCategoryChange}
          onSelectAll={lib.selectAll}
          onDeselectAll={lib.deselectAll}
          onCancel={lib.toggleBatchMode}
          categories={lib.currentTypeCategories}
          isLoading={isBatchLoading}
        />
      )}

      {/* 핀 모드 인디케이터 */}
      {lib.isPinMode && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 bg-accent rounded-full shadow-xl">
          <Pin size={18} className="text-white" />
          <span className="text-sm font-medium text-white">
            핀 모드 - 콘텐츠를 클릭하여 고정 ({lib.pinnedCount}/10)
          </span>
          <button
            onClick={lib.exitPinMode}
            className="ml-2 p-1 rounded-full hover:bg-white/20"
          >
            <X size={18} className="text-white" />
          </button>
        </div>
      )}
    </div>
  );
  // #endregion
}
