"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useContentLibrary } from "./useContentLibrary";
import { useMonthScrollObserver } from "./useMonthScrollObserver";
import MonthSection from "./section/MonthSection";
import ContentItemRenderer from "./item/ContentItemRenderer";
import MonthTransitionIndicator from "./section/MonthTransitionIndicator";
import { LoadingState, ErrorState, EmptyState } from "./ContentLibraryStates";
import { DeleteConfirmModal } from "@/components/ui";
import type { ContentLibraryProps } from "./types";
import type { UserContentWithContent } from "@/actions/contents/getMyContents";
import ContentLibraryControls from "./ContentLibraryControls";
import ContentLibraryBody from "./ContentLibraryBody";
import ArchiveIndexToggle from "./controlBar/ArchiveIndexToggle";

const READ_ONLY_DELETE = () => undefined;

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
  defaultPageSize,
  hideControlWrapper = false,
  hideReviewFilter = false,
  initialContents,
  initialContentBrief,
  filterTrailing,
  onActiveContentChange,
}: ContentLibraryProps) {
  const locale = useLocale();
  const lib = useContentLibrary({
    maxItems, compact, mode, ownerKind, targetUserId,
    defaultViewMode, defaultPageSize,
    initialContents, initialContentBrief,
  });
  const [isExpandIndexOpen, setIsExpandIndexOpen] = useState(false);
  const toggleExpandIndex = useCallback(() => {
    setIsExpandIndexOpen((current) => !current);
  }, []);
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

  const currentVisibleMonth = useMonthScrollObserver(showMonthSections ? lib.monthKeys : [], lib.collapsedMonths);

  const renderItems = (items: UserContentWithContent[], viewMode = lib.viewMode) => (
    <ContentItemRenderer
      items={items}
      compact={compact}
      viewMode={viewMode}
      initialContentBrief={lib.initialContentBrief}
      initialContentRecord={lib.initialContentRecord}
      onDelete={isViewer ? READ_ONLY_DELETE : lib.handleDelete}
      onAddContent={viewMode === "list" ? lib.handleAddContent : undefined}
      readOnly={isViewer}
      targetUserId={targetUserId}
      ownerNickname={ownerNickname}
      ownerAvatarUrl={ownerAvatarUrl}
      savedContentIds={lib.savedContentIds}
      expandIndexPreference={isExpandIndexOpen}
      onExpandIndexPreferenceChange={setIsExpandIndexOpen}
      activeCategory={ownerKind === "celeb" ? lib.activeTab : undefined}
      categoryCounts={ownerKind === "celeb" ? lib.typeCounts : undefined}
      onCategoryChange={ownerKind === "celeb" ? lib.setActiveTab : undefined}
      isContentRefreshing={ownerKind === "celeb" ? lib.isRefreshing : undefined}
      onActiveContentChange={onActiveContentChange}
    />
  );

  const hasContents = lib.contents.length > 0;
  const hasFilteredContents = lib.filteredAndSortedContents.length > 0;
  const isSearching = lib.appliedSearchQuery.trim().length >= 2;
  /* 펼침 보기는 선택 목록 전체를 한 번에 받는다 — 달별 묶음과 쪽 번호는 그 안에서 뜻이 없다 */
  const isExpandView = lib.presentationViewMode === "expand";
  const renderContentsForMode = (viewMode: typeof lib.viewMode) => {
    if (viewMode === "expand") {
      return renderItems(lib.filteredAndSortedContents, viewMode);
    }
    if (showMonthSections && lib.sortOption === "recent") {
      return lib.monthKeys.map((monthKey) => {
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
            {renderItems(items, viewMode)}
          </MonthSection>
        );
      });
    }
    return renderItems(lib.filteredAndSortedContents, viewMode);
  };
  // 에러/로딩 상태
  if (lib.error && !hasContents) return <ErrorState message={lib.error} onRetry={lib.loadContents} compact={compact} />;
  if (lib.isLoading && !hasContents) return <LoadingState compact={compact} />;
  // 검색 중이 아닌데 콘텐츠가 없으면 빈 상태 표시
  if (!hasContents && !isSearching) return <EmptyState message={resolvedEmptyMessage} compact={compact} />;

  return (
    <div>
      {showMonthSections && <MonthTransitionIndicator currentMonthKey={currentVisibleMonth} />}

      {lib.typeCountsError && (
        <div role="alert" className="flex justify-center px-3">
          <ErrorState
            message={lib.typeCountsError}
            onRetry={lib.loadTypeCounts}
            compact
          />
        </div>
      )}

      <div className={ownerKind === "celeb" ? "mx-auto w-fit max-w-full" : undefined}>
        <ContentLibraryControls
          ownerKind={ownerKind}
          categoryItems={lib.contents.map((item) => ({ type: item.content.type }))}
          activeTab={lib.activeTab}
          onTabChange={lib.setActiveTab}
          typeCounts={lib.typeCounts}
          sortOption={lib.sortOption}
          onSortOptionChange={lib.setSortOption}
          reviewFilter={lib.reviewFilter}
          onReviewFilterChange={lib.setReviewFilter}
          viewMode={lib.viewMode}
          onViewModeChange={lib.setViewMode}
          isExpandIndexOpen={isExpandIndexOpen}
          onExpandIndexToggle={toggleExpandIndex}
          isAllCollapsed={lib.isAllCollapsed}
          onExpandAll={lib.expandAll}
          onCollapseAll={lib.collapseAll}
          searchQuery={lib.searchQuery}
          onSearchChange={lib.setSearchQuery}
          onSearch={lib.executeSearch}
          onClearSearch={lib.clearSearch}
          hasAppliedSearch={lib.appliedSearchQuery.trim().length >= 2}
          showMonthControls={showMonthSections}
          allowRatingSort={ownerKind === "member"}
          hideReviewFilter={hideReviewFilter}
          compact={hideControlWrapper}
          hideWrapper={hideControlWrapper}
          trailing={filterTrailing}
        />

        {/* 인물 서가는 늘 펼침이라 감상 목록 단추를 조작대 아래 한 줄로 둔다 */}
        {ownerKind === "celeb" && (
          <ArchiveIndexToggle
            isOpen={isExpandIndexOpen}
            onToggle={toggleExpandIndex}
            label={tArchive("expandIndexTitle")}
            className="mb-2 w-full"
          />
        )}
      </div>

      <ContentLibraryBody
        animateHeight={ownerKind === "celeb"}
        compact={compact}
        currentPage={lib.currentPage}
        error={lib.error}
        hasContents={hasContents}
        hasFilteredContents={hasFilteredContents}
        isExpandView={isExpandView}
        isRefreshing={lib.isRefreshing}
        loadContents={lib.loadContents}
        noResultsMessage={tArchive("noResults")}
        onPageChange={lib.setCurrentPage}
        onPageSizeChange={lib.setPageSize}
        pageSize={lib.pageSize}
        presentationViewMode={lib.presentationViewMode}
        renderContentsForMode={renderContentsForMode}
        showPagination={showPagination}
        totalPages={lib.totalPages}
      />
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
}
