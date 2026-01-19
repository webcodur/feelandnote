/*
  파일명: /components/features/user/contentLibrary/ContentLibrary.tsx
  기능: 콘텐츠 라이브러리 메인 컴포넌트
  책임: 필터, 정렬, 페이지네이션을 포함한 콘텐츠 목록을 표시한다.
*/ // ------------------------------
"use client";

import { useContentLibrary } from "./useContentLibrary";
import { useMonthScrollObserver } from "./useMonthScrollObserver";
import ArchiveControlBar from "./controlBar/ArchiveControlBar";
import { TAB_OPTIONS } from "./controlBar/constants";
import MonthSection from "./section/MonthSection";
import ContentItemRenderer from "./item/ContentItemRenderer";
import MonthTransitionIndicator from "./section/MonthTransitionIndicator";
import { LoadingState, ErrorState, EmptyState } from "./ContentLibraryStates";
import { Pagination, DeleteConfirmModal } from "@/components/ui";
import type { ContentLibraryProps } from "./types";
import type { UserContentWithContent } from "@/actions/contents/getMyContents";

export default function ContentLibrary({
  compact = false,
  maxItems,
  showCategories = true,
  showPagination = true,
  emptyMessage = "아직 기록한 콘텐츠가 없습니다",
  mode = "owner",
  targetUserId,
}: ContentLibraryProps) {
  const lib = useContentLibrary({ maxItems, compact, mode, targetUserId });
  const isViewer = lib.isViewer;

  const currentVisibleMonth = useMonthScrollObserver(lib.monthKeys, lib.collapsedMonths);

  // #region 헬퍼 함수
  const renderItems = (items: UserContentWithContent[]) => (
    <ContentItemRenderer
      items={items}
      compact={compact}
      onDelete={lib.handleDelete}
      readOnly={isViewer}
      targetUserId={targetUserId}
    />
  );

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
          statusFilter={lib.statusFilter}
          onStatusFilterChange={lib.setStatusFilter}
          sortOption={lib.sortOption}
          onSortOptionChange={lib.setSortOption}
          isAllCollapsed={lib.isAllCollapsed}
          onExpandAll={lib.expandAll}
          onCollapseAll={lib.collapseAll}
        />
      </div>

      <div>
        {renderStates()}

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
    </div>
  );
  // #endregion
}
