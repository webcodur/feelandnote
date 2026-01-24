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
import { Pagination, DeleteConfirmModal, InnerBox, DecorativeLabel } from "@/components/ui";
import ClassicalBox from "@/components/ui/ClassicalBox";
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
      ownerNickname={ownerNickname}
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

      <div>
        {renderStates()}

        {/* 콘텐츠 목록 (월별) */}
        {!lib.isLoading && !lib.error && hasFilteredContents && (
          <ClassicalBox className="p-4 sm:p-8 bg-bg-card/50 shadow-2xl border-accent-dim/20">
            <div className="flex justify-center mb-6">
              <DecorativeLabel label="기록관" />
            </div>
            {/* Control Bar inside Box */}
            <InnerBox className="mb-6 p-3 sticky top-0 z-30 backdrop-blur-sm flex justify-center items-center">
               <ArchiveControlBar
                activeTab={lib.activeTab}
                onTabChange={lib.setActiveTab}
                typeCounts={lib.typeCounts}
                sortOption={lib.sortOption}
                onSortOptionChange={lib.setSortOption}
                isAllCollapsed={lib.isAllCollapsed}
                onExpandAll={lib.expandAll}
                onCollapseAll={lib.collapseAll}
              />
            </InnerBox>

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
          </ClassicalBox>
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
