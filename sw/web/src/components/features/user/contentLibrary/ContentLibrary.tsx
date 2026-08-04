/*
  파일명: /components/features/user/contentLibrary/ContentLibrary.tsx
  기능: 콘텐츠 라이브러리 메인 컴포넌트
  책임: 필터, 정렬, 페이지네이션을 포함한 콘텐츠 목록을 표시한다.
*/ // ------------------------------
"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { SlidersHorizontal } from "lucide-react";
import { useContentLibrary } from "./useContentLibrary";
import { useMonthScrollObserver } from "./useMonthScrollObserver";
import ArchiveControlBar from "./controlBar/ArchiveControlBar";
import MonthSection from "./section/MonthSection";
import ContentItemRenderer from "./item/ContentItemRenderer";
import MonthTransitionIndicator from "./section/MonthTransitionIndicator";
import { LoadingState, ErrorState, EmptyState } from "./ContentLibraryStates";
import { Pagination, DeleteConfirmModal } from "@/components/ui";
import ControlPanel from "@/components/shared/ControlPanel";
import type { ContentLibraryProps } from "./types";
import type { UserContentWithContent } from "@/actions/contents/getMyContents";

export default function ContentLibrary({
  compact = false,
  maxItems,
  showPagination = true,
  emptyMessage,
  mode = "owner",
  targetUserId,
  ownerNickname,
  defaultViewMode,
  defaultPageSize,
  hideControlWrapper = false,
  initialContents,
}: ContentLibraryProps) {
  const locale = useLocale();
  const lib = useContentLibrary({ maxItems, compact, mode, targetUserId, defaultViewMode, defaultPageSize, initialContents });
  const isViewer = lib.isViewer;
  const t = useTranslations("celebPage");
  const tArchive = useTranslations("archiveSearch");
  const resolvedEmptyMessage = emptyMessage ?? tArchive("empty");
  const [isControlsExpanded, setIsControlsExpanded] = useState(false);
  const applySearchQuery = lib.applySearchQuery;

  // URL 검색어는 hydration 뒤에만 반영한다. useSearchParams를 서버 렌더 경로에서
  // 제거해 셀럽 서가의 초기 목록·감상문이 정적 HTML에 그대로 남게 한다.
  useEffect(() => {
    const query = new URLSearchParams(window.location.search).get("q") ?? "";
    if (query) applySearchQuery(query);
  }, [applySearchQuery]);

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
  if (!hasContents && !isSearching) return <EmptyState message={resolvedEmptyMessage} compact={compact} />;

  return (
    <div>
      <MonthTransitionIndicator currentMonthKey={currentVisibleMonth} />

      {/* 컨트롤 패널 */}
      {hideControlWrapper ? (
        <div className="mb-2">
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
            compact
          />
        </div>
      ) : (
        <ControlPanel
          title={t("recordControl")}
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
      )}

      {/* 콘텐츠 목록 — 재조회 중에도 기존 기록을 읽고 조작할 수 있다. */}
      <div className="relative">
        {lib.isRefreshing && (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-2 top-0 z-20 h-px animate-pulse bg-accent shadow-[0_0_10px_color-mix(in_srgb,var(--color-accent)_55%,transparent)]"
          />
        )}
        <div
          aria-busy={lib.isRefreshing}
          className="py-8 [overflow-anchor:none]"
        >
          {hasFilteredContents ? (
            lib.sortOption === "recent" ? (
              lib.monthKeys.map((monthKey) => {
                const items = lib.groupedByMonth[monthKey] || [];
                return (
                  <MonthSection
                    key={monthKey}
                    monthKey={monthKey}
                    label={lib.formatMonthLabel(monthKey, locale)}
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
              {tArchive("noResults")}
            </div>
          )}

          {/* 쪽 넘김 — 재조회 중에도 자리를 지켜야 누른 단추가 눈앞에서 사라지지 않는다 */}
          {!compact && showPagination && (
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
          affectedPlaylists={lib.deleteAffectedFlows}
          itemCount={1}
        />
      )}
    </div>
  );
  // #endregion
}
