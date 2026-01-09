/*
  파일명: /components/features/archive/contentLibrary/ContentLibrary.tsx
  기능: 콘텐츠 라이브러리 메인 컴포넌트
  책임: 필터, 정렬, 페이지네이션을 포함한 콘텐츠 목록을 표시한다.
*/ // ------------------------------
"use client";

import { useMemo } from "react";
import { useContentLibrary } from "./useContentLibrary";
import { useBatchActions } from "./useBatchActions";
import { useMonthScrollObserver } from "./useMonthScrollObserver";
import { useKeyboardShortcuts } from "./useKeyboardShortcuts";
import ArchiveControlBar from "./controlBar/ArchiveControlBar";
import { TAB_OPTIONS } from "./controlBar/constants";
import MonthSection from "./section/MonthSection";
import ContentItemRenderer from "./item/ContentItemRenderer";
import MonthTransitionIndicator from "./section/MonthTransitionIndicator";
import { LoadingState, ErrorState, EmptyState } from "./ContentLibraryStates";
import CategoryManager from "./CategoryManager";
import BatchActionBar from "./batchActions/BatchActionBar";
import PinActionBar from "./batchActions/PinActionBar";
import PinnedCorkBoard from "./batchActions/PinnedCorkBoard";
import { Pagination, DeleteConfirmModal } from "@/components/ui";
import type { ContentLibraryProps } from "./types";
import type { UserContentWithContent } from "@/actions/contents/getMyContents";

export default function ContentLibrary({
  compact = false,
  maxItems,
  showCategories = true,
  showPagination = true,
  emptyMessage = "아직 기록한 콘텐츠가 없습니다",
  headerActions,
  mode = "owner",
  targetUserId,
}: ContentLibraryProps) {
  const lib = useContentLibrary({ maxItems, compact, showCategories, mode, targetUserId });
  const isViewer = lib.isViewer;

  // userContentId -> contentId 매핑 생성
  const contentIdMap = useMemo(() => {
    const map = new Map<string, string>();
    lib.contents.forEach((item) => map.set(item.id, item.content_id));
    return map;
  }, [lib.contents]);

  const {
    isBatchLoading,
    isDeleteModalOpen,
    affectedPlaylists,
    openDeleteModal,
    closeDeleteModal,
    confirmDelete,
    handleBatchCategoryChange,
  } = useBatchActions({
    selectedIds: lib.selectedIds,
    contentIdMap,
    toggleBatchMode: lib.toggleBatchMode,
    loadContents: lib.loadContents,
    loadCategories: lib.loadCategories,
  });

  const currentVisibleMonth = useMonthScrollObserver(lib.monthKeys, lib.collapsedMonths);

  useKeyboardShortcuts({
    isBatchMode: lib.isBatchMode,
    isPinMode: lib.isPinMode,
    toggleBatchMode: lib.toggleBatchMode,
    exitPinMode: lib.exitPinMode,
  });

  // #region 헬퍼 함수
  const renderItems = (items: UserContentWithContent[]) => (
    <ContentItemRenderer
      items={items}
      viewMode={lib.viewMode}
      compact={compact}
      categories={lib.currentTypeCategories}
      onStatusChange={lib.handleStatusChange}
      onRecommendChange={lib.handleRecommendChange}
      onDateChange={lib.handleDateChange}
      onCategoryChange={lib.handleMoveToCategory}
      onVisibilityChange={lib.handleVisibilityChange}
      onDelete={lib.handleDelete}
      isBatchMode={lib.isBatchMode}
      selectedIds={lib.selectedIds}
      onToggleSelect={lib.toggleSelect}
      isPinMode={lib.isPinMode}
      onPinToggle={lib.handlePinToggle}
      readOnly={isViewer}
      targetUserId={targetUserId}
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

  // #region 렌더링
  return (
    <div>
      <MonthTransitionIndicator currentMonthKey={currentVisibleMonth} />

      {/* Control Bar */}
      <div className={compact ? "mb-3" : "mb-2"}>
        <ArchiveControlBar
          activeTab={lib.activeTab}
          onTabChange={lib.setActiveTab}
          typeCounts={lib.typeCounts}
          categories={showCategories ? lib.currentTypeCategories : []}
          selectedCategoryId={lib.selectedCategoryId}
          onCategoryChange={lib.setSelectedCategoryId}
          onManageCategories={handleCategoryManage}
          statusFilter={lib.statusFilter}
          onStatusFilterChange={lib.setStatusFilter}
          sortOption={lib.sortOption}
          onSortOptionChange={lib.setSortOption}
          viewMode={lib.viewMode}
          onViewModeChange={lib.setViewMode}
          isAllCollapsed={lib.isAllCollapsed}
          onExpandAll={lib.expandAll}
          onCollapseAll={lib.collapseAll}
          customActions={
            isViewer ? undefined :
            typeof headerActions === "function"
              ? headerActions({
                  toggleBatchMode: lib.toggleBatchMode,
                  isBatchMode: lib.isBatchMode,
                  togglePinMode: () => (lib.isPinMode ? lib.exitPinMode() : lib.enterPinMode()),
                  isPinMode: lib.isPinMode,
                })
              : headerActions
          }
        />
      </div>

      <div>
        {renderStates()}

        {/* 코르크 보드 (핀된 콘텐츠) - owner 모드에서만 표시 */}
        {!isViewer && !lib.isLoading && !lib.error && (lib.pinnedContents.length > 0 || lib.isPinMode) && (
          <PinnedCorkBoard items={lib.pinnedContents} isPinMode={lib.isPinMode} onUnpin={lib.handlePinToggle} />
        )}

        {/* 콘텐츠 목록 (월별) */}
        {!lib.isLoading && !lib.error && hasFilteredContents && (
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
        )}

        {/* 페이지네이션 */}
        {!compact && showPagination && !lib.isLoading && lib.totalPages > 1 && (
          <div className="mt-6 flex justify-center">
            <Pagination currentPage={lib.currentPage} totalPages={lib.totalPages} onPageChange={lib.setCurrentPage} />
          </div>
        )}
      </div>

      {/* 분류 관리 모달 - owner 모드에서만 */}
      {!isViewer && lib.categoryManagerType && (
        <CategoryManager
          contentType={lib.categoryManagerType}
          categories={lib.categories[lib.categoryManagerType] || []}
          onCategoriesChange={() => {
            lib.loadCategories();
            lib.loadContents();
          }}
          onClose={() => lib.setCategoryManagerType(null)}
        />
      )}

      {/* 배치 모드 액션 바 - owner 모드에서만 */}
      {!isViewer && lib.isBatchMode && (
        <BatchActionBar
          selectedCount={lib.selectedIds.size}
          totalCount={lib.filteredAndSortedContents.length}
          onDelete={openDeleteModal}
          onCategoryChange={handleBatchCategoryChange}
          onSelectAll={lib.selectAll}
          onDeselectAll={lib.deselectAll}
          onCancel={lib.toggleBatchMode}
          categories={lib.currentTypeCategories}
          isLoading={isBatchLoading}
        />
      )}

      {/* 일괄 삭제 확인 모달 - owner 모드에서만 */}
      {!isViewer && (
        <DeleteConfirmModal
          isOpen={isDeleteModalOpen}
          onClose={closeDeleteModal}
          onConfirm={confirmDelete}
          isLoading={isBatchLoading}
          affectedPlaylists={affectedPlaylists}
          itemCount={lib.selectedIds.size}
        />
      )}

      {/* 개별 삭제 확인 모달 - owner 모드에서만 */}
      {!isViewer && (
        <DeleteConfirmModal
          isOpen={lib.isDeleteModalOpen}
          onClose={lib.closeDeleteModal}
          onConfirm={lib.confirmDelete}
          isLoading={lib.isDeleteLoading}
          affectedPlaylists={lib.deleteAffectedPlaylists}
          itemCount={1}
        />
      )}

      {/* 핀 모드 액션 바 - owner 모드에서만 */}
      {!isViewer && lib.isPinMode && <PinActionBar pinnedCount={lib.pinnedCount} onExit={lib.exitPinMode} />}
    </div>
  );
  // #endregion
}
