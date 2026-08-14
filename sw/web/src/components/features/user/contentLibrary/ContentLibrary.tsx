/*
  파일명: /components/features/user/contentLibrary/ContentLibrary.tsx
  기능: 콘텐츠 라이브러리 메인 컴포넌트
  책임: 필터, 정렬, 페이지네이션을 포함한 콘텐츠 목록을 표시한다.
*/ // ------------------------------
"use client";

import { useEffect } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useContentLibrary } from "./useContentLibrary";
import { useMonthScrollObserver } from "./useMonthScrollObserver";
import MonthSection from "./section/MonthSection";
import ContentItemRenderer from "./item/ContentItemRenderer";
import MonthTransitionIndicator from "./section/MonthTransitionIndicator";
import { LoadingState, ErrorState, EmptyState } from "./ContentLibraryStates";
import { Pagination, DeleteConfirmModal } from "@/components/ui";
import type { ContentLibraryProps } from "./types";
import type { UserContentWithContent } from "@/actions/contents/getMyContents";
import ContentLibraryControls from "./ContentLibraryControls";

export default function ContentLibrary({
  compact = false,
  maxItems,
  showPagination = true,
  emptyMessage,
  mode = "owner",
  ownerKind = "member",
  targetUserId,
  ownerNickname,
  ownerAvatarUrl,
  defaultViewMode,
  desktopViewMode,
  defaultPageSize,
  hideControlWrapper = false,
  initialContents,
}: ContentLibraryProps) {
  const locale = useLocale();
  const lib = useContentLibrary({ maxItems, compact, mode, ownerKind, targetUserId, defaultViewMode, desktopViewMode, defaultPageSize, initialContents });
  const isViewer = lib.isViewer;
  /** 셀럽 감상은 서비스 등록일이 감상 시점이 아니므로 월별로 나누지 않는다. */
  const showMonthSections = ownerKind !== "celeb";
  const tArchive = useTranslations("archiveSearch");
  const resolvedEmptyMessage = emptyMessage ?? tArchive("empty");
  const applySearchQuery = lib.applySearchQuery;

  // URL 검색어는 hydration 뒤에만 반영한다. useSearchParams를 서버 렌더 경로에서
  // 제거해 셀럽 서가의 초기 목록·감상문이 정적 HTML에 그대로 남게 한다.
  useEffect(() => {
    const query = new URLSearchParams(window.location.search).get("q") ?? "";
    if (query) applySearchQuery(query);
  }, [applySearchQuery]);

  const currentVisibleMonth = useMonthScrollObserver(
    showMonthSections ? lib.monthKeys : [],
    lib.collapsedMonths,
  );

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
      ownerAvatarUrl={ownerAvatarUrl}
      savedContentIds={lib.savedContentIds}
    />
  );

  // #endregion

  // #region 렌더링 - 상태
  const hasContents = lib.contents.length > 0;
  const hasFilteredContents = lib.filteredAndSortedContents.length > 0;
  const isSearching = lib.appliedSearchQuery.trim().length >= 2;
  /* 펼침 보기는 선택 목록 전체를 한 번에 받는다 — 달별 묶음과 쪽 번호는 그 안에서 뜻이 없다 */
  const isExpandView = lib.viewMode === "expand";
  // #endregion

  // #region 렌더링
  // 에러/로딩 상태
  if (lib.error) return <ErrorState message={lib.error} onRetry={lib.loadContents} compact={compact} />;
  if (lib.isLoading) return <LoadingState compact={compact} />;
  // 검색 중이 아닌데 콘텐츠가 없으면 빈 상태 표시
  if (!hasContents && !isSearching) return <EmptyState message={resolvedEmptyMessage} compact={compact} />;

  return (
    <div>
      {showMonthSections && <MonthTransitionIndicator currentMonthKey={currentVisibleMonth} />}

      <ContentLibraryControls
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
        showMonthControls={showMonthSections}
        allowRatingSort={ownerKind === "member"}
        compact={hideControlWrapper}
        hideWrapper={hideControlWrapper}
      />

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
            isExpandView ? (
              renderItems(lib.filteredAndSortedContents)
            ) : showMonthSections && lib.sortOption === "recent" ? (
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
          {!compact && showPagination && !isExpandView && (
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
