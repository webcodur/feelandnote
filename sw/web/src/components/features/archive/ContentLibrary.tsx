"use client";

import { useMemo } from "react";
import { useContentLibrary } from "./hooks/useContentLibrary";
import ContentLibraryHeader, { TAB_OPTIONS } from "./ContentLibraryHeader";
import ContentLibraryFilters from "./ContentLibraryFilters";
import CategorySection, { MAX_ITEMS_PER_CATEGORY } from "./CategorySection";
import FolderSection, { UncategorizedSection } from "./FolderSection";
import ContentItemRenderer from "./ContentItemRenderer";
import { LoadingState, ErrorState, EmptyState } from "./ContentLibraryStates";
import FolderManager from "./FolderManager";
import { Pagination } from "@/components/ui";
import type { ContentType } from "@/types/database";
import type { UserContentWithContent } from "@/actions/contents/getMyContents";

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
  const lib = useContentLibrary({ maxItems, compact, showFolders });

  const filteredAndSortedContents = useMemo(() => {
    let result = [...lib.contents];

    if (lib.progressFilter !== "all") {
      result = result.filter((item) => {
        const progress = item.progress ?? 0;
        switch (lib.progressFilter) {
          case "not_started": return progress === 0;
          case "in_progress": return progress > 0 && progress < 100;
          case "completed": return progress === 100;
          default: return true;
        }
      });
    }

    result.sort((a, b) => {
      switch (lib.sortOption) {
        case "title": return (a.content?.title ?? "").localeCompare(b.content?.title ?? "");
        case "progress_asc": return (a.progress ?? 0) - (b.progress ?? 0);
        case "progress_desc": return (b.progress ?? 0) - (a.progress ?? 0);
        default: return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

    return result;
  }, [lib.contents, lib.progressFilter, lib.sortOption]);

  const groupedContents = useMemo(() => {
    if (lib.activeTab !== "all") return null;

    const groups: Record<ContentType, {
      uncategorized: UserContentWithContent[];
      byFolder: Record<string, UserContentWithContent[]>;
    }> = {
      BOOK: { uncategorized: [], byFolder: {} },
      VIDEO: { uncategorized: [], byFolder: {} },
      GAME: { uncategorized: [], byFolder: {} },
      MUSIC: { uncategorized: [], byFolder: {} },
      CERTIFICATE: { uncategorized: [], byFolder: {} },
    };

    filteredAndSortedContents.forEach((item) => {
      const type = item.content.type as ContentType;
      if (!groups[type]) return;
      if (item.folder_id) {
        if (!groups[type].byFolder[item.folder_id]) groups[type].byFolder[item.folder_id] = [];
        groups[type].byFolder[item.folder_id].push(item);
      } else {
        groups[type].uncategorized.push(item);
      }
    });

    return groups;
  }, [lib.activeTab, filteredAndSortedContents]);

  const folderGroupedContents = useMemo(() => {
    if (lib.activeTab === "all") return null;
    const result: { uncategorized: UserContentWithContent[]; byFolder: Record<string, UserContentWithContent[]> } = { uncategorized: [], byFolder: {} };
    filteredAndSortedContents.forEach((item) => {
      if (item.folder_id) {
        if (!result.byFolder[item.folder_id]) result.byFolder[item.folder_id] = [];
        result.byFolder[item.folder_id].push(item);
      } else {
        result.uncategorized.push(item);
      }
    });
    return result;
  }, [lib.activeTab, filteredAndSortedContents]);

  const currentCategoryFolders = useMemo(() => {
    if (lib.activeTab === "all") return [];
    const tab = TAB_OPTIONS.find((t) => t.value === lib.activeTab);
    return tab?.type ? lib.folders[tab.type] || [] : [];
  }, [lib.activeTab, lib.folders]);

  const getFolderName = (folderId: string, contentType: ContentType) => {
    return lib.folders[contentType]?.find((f) => f.id === folderId)?.name || "알 수 없는 폴더";
  };

  const renderItems = (items: UserContentWithContent[]) => (
    <ContentItemRenderer
      items={items}
      viewMode={lib.viewMode}
      compact={compact}
      onProgressChange={lib.handleProgressChange}
      onStatusChange={lib.handleStatusChange}
      onDelete={lib.handleDelete}
    />
  );

  return (
    <div>
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
            onFolderManage={() => {
              const tab = TAB_OPTIONS.find((t) => t.value === lib.activeTab);
              if (tab?.type) lib.setFolderManagerType(tab.type);
            }}
          />
        )}
        {showFilters && (
          <ContentLibraryFilters
            progressFilter={lib.progressFilter}
            onProgressFilterChange={lib.setProgressFilter}
            sortOption={lib.sortOption}
            onSortOptionChange={lib.setSortOption}
            showExpandToggle={lib.activeTab === "all"}
            isAllCollapsed={lib.isAllCollapsed}
            onExpandAll={lib.expandAll}
            onCollapseAll={lib.collapseAll}
            compact={compact}
          />
        )}
      </div>

      {lib.error && <ErrorState message={lib.error} onRetry={lib.loadContents} compact={compact} />}
      {lib.isLoading && <LoadingState compact={compact} />}
      {!lib.isLoading && !lib.error && lib.contents.length === 0 && <EmptyState message={emptyMessage} compact={compact} />}
      {!lib.isLoading && !lib.error && lib.contents.length > 0 && filteredAndSortedContents.length === 0 && (
        <EmptyState message="필터 조건에 맞는 콘텐츠가 없습니다" compact={compact} />
      )}

      {!lib.isLoading && !lib.error && filteredAndSortedContents.length > 0 && lib.activeTab === "all" && groupedContents && (
        <div className="space-y-5">
          {(Object.entries(groupedContents) as [ContentType, typeof groupedContents[ContentType]][]).map(([type, group]) => {
            const allItems = [...Object.values(group.byFolder).flat(), ...group.uncategorized];
            if (allItems.length === 0) return null;
            const categoryTab = TAB_OPTIONS.find((t) => t.type === type);
            return (
              <CategorySection
                key={type}
                type={type}
                totalItems={allItems.length}
                isCollapsed={lib.collapsedCategories.has(type)}
                onToggle={() => lib.toggleCategory(type)}
                onShowMore={categoryTab ? () => lib.setActiveTab(categoryTab.value) : undefined}
              >
                {renderItems(allItems.slice(0, MAX_ITEMS_PER_CATEGORY))}
              </CategorySection>
            );
          })}
        </div>
      )}

      {!lib.isLoading && !lib.error && filteredAndSortedContents.length > 0 && lib.activeTab !== "all" && folderGroupedContents && (
        <div>
          {currentCategoryFolders.length > 0 && showFolders ? (
            <>
              {currentCategoryFolders.map((folder) => {
                const items = folderGroupedContents.byFolder[folder.id] || [];
                if (items.length === 0) return null;
                const tab = TAB_OPTIONS.find((t) => t.value === lib.activeTab);
                return (
                  <FolderSection
                    key={folder.id}
                    folderId={folder.id}
                    folderName={getFolderName(folder.id, tab?.type as ContentType)}
                    itemCount={items.length}
                    isCollapsed={lib.collapsedFolders.has(folder.id)}
                    onToggle={() => lib.toggleFolder(folder.id)}
                  >
                    {renderItems(items)}
                  </FolderSection>
                );
              })}
              <UncategorizedSection
                itemCount={folderGroupedContents.uncategorized.length}
                isCollapsed={lib.collapsedFolders.has("uncategorized")}
                onToggle={() => lib.toggleFolder("uncategorized")}
              >
                {renderItems(folderGroupedContents.uncategorized)}
              </UncategorizedSection>
            </>
          ) : (
            renderItems(filteredAndSortedContents)
          )}
        </div>
      )}

      {!compact && showPagination && !lib.isLoading && lib.totalPages > 1 && lib.activeTab !== "all" && (
        <div className="mt-6 flex justify-center">
          <Pagination currentPage={lib.currentPage} totalPages={lib.totalPages} onPageChange={lib.setCurrentPage} />
        </div>
      )}

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
}
