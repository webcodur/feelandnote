/*
  파일명: /components/features/user/contentLibrary/ContentLibrary.tsx
  기능: 콘텐츠 라이브러리 메인 컴포넌트
  책임: 필터, 정렬, 페이지네이션을 포함한 콘텐츠 목록을 표시한다.
*/ // ------------------------------
"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { SlidersHorizontal } from "lucide-react";
import { useContentLibrary } from "./useContentLibrary";
import { useMonthScrollObserver } from "./useMonthScrollObserver";
import ArchiveControlBar from "./controlBar/ArchiveControlBar";
import { TAB_OPTIONS } from "./controlBar/constants";
import MonthSection from "./section/MonthSection";
import ContentItemRenderer from "./item/ContentItemRenderer";
import MonthTransitionIndicator from "./section/MonthTransitionIndicator";
import { LoadingState, ErrorState, EmptyState } from "./ContentLibraryStates";
import { Pagination, DeleteConfirmModal, DecorativeLabel } from "@/components/ui";
import ControlPanel from "@/components/shared/ControlPanel";
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
  ownerNickname,
}: ContentLibraryProps) {
  const searchParams = useSearchParams();
  const initialSearchQuery = searchParams.get("q") || "";
  const lib = useContentLibrary({ maxItems, compact, mode, targetUserId, initialSearchQuery });
  const isViewer = lib.isViewer;
  const [isControlsExpanded, setIsControlsExpanded] = useState(false);

  const currentVisibleMonth = useMonthScrollObserver(lib.monthKeys, lib.collapsedMonths);

  // #region 헬퍼 함수
  const renderItems = (items: UserContentWithContent[]) => (
    <ContentItemRenderer
      items={items}
      compact={compact}
      viewMode={lib.viewMode}
      onDelete={lib.handleDelete}
      onAddContent={lib.handleAddContent}
      readOnly={isViewer}
      targetUserId={targetUserId}
      ownerNickname={ownerNickname}
      savedContentIds={lib.savedContentIds}
    />
  );

  // #endregion

  // #region 렌더링 - 상태
  const hasContents = lib.contents.length > 0;
  const hasFilteredContents = lib.filteredAndSortedContents.length > 0;
  const isSearching = lib.appliedSearchQuery.trim().length >= 2;
  // #endregion

  // #region 렌더링
  // 에러/로딩 상태
  if (lib.error) return <ErrorState message={lib.error} onRetry={lib.loadContents} compact={compact} />;
  if (lib.isLoading) return <LoadingState compact={compact} />;
  // 검색 중이 아닌데 콘텐츠가 없으면 빈 상태 표시
  if (!hasContents && !isSearching) return <EmptyState message={emptyMessage} compact={compact} />;

  return (
    <div>
      <MonthTransitionIndicator currentMonthKey={currentVisibleMonth} />

      {/* 컨트롤 패널 */}
      <ControlPanel
        title="기록 제어"
        icon={<SlidersHorizontal size={16} className="text-accent/70" />}
        isExpanded={isControlsExpanded}
        onToggleExpand={() => setIsControlsExpanded(!isControlsExpanded)}
        className="mb-6 sticky top-0 z-30 max-w-2xl mx-auto"
      >
        <ArchiveControlBar
          activeTab={lib.activeTab}
          onTabChange={lib.setActiveTab}
          typeCounts={lib.typeCounts}
          sortOption={lib.sortOption}
          onSortOptionChange={lib.setSortOption}
          reviewFilter={lib.reviewFilter}
          onReviewFilterChange={lib.setReviewFilter}
          viewMode={lib.viewMode}
          onViewModeChange={lib.setViewMode}
          isAllCollapsed={lib.isAllCollapsed}
          onExpandAll={lib.expandAll}
          onCollapseAll={lib.collapseAll}
          searchQuery={lib.searchQuery}
          onSearchChange={lib.setSearchQuery}
          onSearch={lib.executeSearch}
          onClearSearch={lib.clearSearch}
        />
      </ControlPanel>

      {/* 콘텐츠 목록 */}
      <div>
        <div className="py-8">
          <div className="flex justify-center mb-8">
            <DecorativeLabel label="시간별 연대기" />
          </div>

          {hasFilteredContents ? (
            lib.sortOption === "recent" ? (
              lib.monthKeys.map((monthKey) => {
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
              })
            ) : (
              renderItems(lib.filteredAndSortedContents)
            )
          ) : (
            <div className="py-12 text-center text-text-secondary">
              검색 결과가 없습니다
            </div>
          )}

          {/* 페이지네이션 */}
          {!compact && showPagination && !lib.isLoading && (
            <>
              <hr className="border-white/10 mt-8 mb-8" />
              <div className="flex justify-center">
                <Pagination
                  currentPage={lib.currentPage}
                  totalPages={lib.totalPages}
                  onPageChange={lib.setCurrentPage}
                  pageSize={lib.pageSize}
                  onPageSizeChange={lib.setPageSize}
                  showPageSizeSelector
                />
              </div>
            </>
          )}
        </div>
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
