/*
  파일명: /components/features/archive/ContentLibrary.tsx
  기능: 사용자의 콘텐츠 라이브러리 메인 컴포넌트
  책임: 콘텐츠 목록 표시, 필터링, 정렬, 폴더 관리 UI를 제공한다.
*/ // ------------------------------
"use client";

import { useContentLibrary } from "./hooks/useContentLibrary";
import ContentLibraryHeader, { TAB_OPTIONS } from "./ContentLibraryHeader";
import ContentLibraryFilters from "./ContentLibraryFilters";
import MonthSection from "./MonthSection";
import ContentItemRenderer from "./ContentItemRenderer";
import { LoadingState, ErrorState, EmptyState } from "./ContentLibraryStates";
import FolderManager from "./FolderManager";
import { Pagination } from "@/components/ui";

import type { UserContentWithContent } from "@/actions/contents/getMyContents";

// #region 타입
interface ContentLibraryProps {
  compact?: boolean;
  maxItems?: number;
  showTabs?: boolean;
  showFilters?: boolean;
  showViewToggle?: boolean;
  showFolders?: boolean;
  showPagination?: boolean;
  emptyMessage?: string;
}
// #endregion

export default function ContentLibrary({
  compact = false,
  maxItems,
  showTabs = true,
  showFilters = true,
  showViewToggle = true,
  showFolders = true,
  showPagination = true,
  emptyMessage = "아직 기록한 콘텐츠가 없습니다",
}: ContentLibraryProps) {
  // #region 훅
  const lib = useContentLibrary({ maxItems, compact, showFolders });
  // #endregion

  // #region 헬퍼 함수
  const renderItems = (items: UserContentWithContent[]) => (
    <ContentItemRenderer
      items={items}
      viewMode={lib.viewMode}
      compact={compact}
      onProgressChange={lib.handleProgressChange}
      onStatusChange={lib.handleStatusChange}
      onRecommendChange={lib.handleRecommendChange}
      onDateChange={lib.handleDateChange}
      onDelete={lib.handleDelete}
    />
  );

  const handleFolderManage = () => {
    const tab = TAB_OPTIONS.find((t) => t.value === lib.activeTab);
    if (tab?.type) lib.setFolderManagerType(tab.type);
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
    <div className="space-y-5">
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

  // #region 렌더링
  return (
    <div>
      {/* 헤더 & 필터 */}
      <div className={`flex flex-col gap-3 ${compact ? "mb-3" : "mb-4"}`}>
        {(showTabs || showViewToggle) && (
          <ContentLibraryHeader
            activeTab={lib.activeTab}
            onTabChange={lib.setActiveTab}
            viewMode={lib.viewMode}
            onViewModeChange={lib.setViewMode}
            showTabs={showTabs}
            showViewToggle={showViewToggle}
            showFolders={showFolders}
            compact={compact}
            onFolderManage={handleFolderManage}
          />
        )}
        {showFilters && (
          <ContentLibraryFilters
            progressFilter={lib.progressFilter}
            onProgressFilterChange={lib.setProgressFilter}
            sortOption={lib.sortOption}
            onSortOptionChange={lib.setSortOption}
            showExpandToggle={lib.monthKeys.length > 0}
            isAllCollapsed={lib.isAllCollapsed}
            onExpandAll={lib.expandAll}
            onCollapseAll={lib.collapseAll}
            compact={compact}
          />
        )}
      </div>

      {/* 상태 표시 (로딩, 에러, 빈 상태) */}
      {renderStates()}

      {/* 콘텐츠 목록 (월별) */}
      {!lib.isLoading && !lib.error && hasFilteredContents && renderMonthlyContent()}

      {/* 페이지네이션 */}
      {!compact && showPagination && !lib.isLoading && lib.totalPages > 1 && (
        <div className="mt-6 flex justify-center">
          <Pagination currentPage={lib.currentPage} totalPages={lib.totalPages} onPageChange={lib.setCurrentPage} />
        </div>
      )}

      {/* 폴더 관리 모달 */}
      {lib.folderManagerType && (
        <FolderManager
          contentType={lib.folderManagerType}
          folders={lib.folders[lib.folderManagerType] || []}
          onFoldersChange={() => { lib.loadFolders(); lib.loadContents(); }}
          onClose={() => lib.setFolderManagerType(null)}
        />
      )}
    </div>
  );
  // #endregion
}
