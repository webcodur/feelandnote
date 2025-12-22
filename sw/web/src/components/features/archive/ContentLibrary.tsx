"use client";

import { useState, useEffect, useCallback, useTransition, useMemo } from "react";
import { ContentCard } from "@/components/features/cards";
import ContentListItem from "./ContentListItem";
import FolderManager from "./FolderManager";
import { getMyContents, getMyContentsAll, type UserContentWithContent } from "@/actions/contents/getMyContents";
import { getFolders } from "@/actions/folders/getFolders";
import { moveToFolder } from "@/actions/folders/moveToFolder";
import { updateProgress } from "@/actions/contents/updateProgress";
import { updateStatus } from "@/actions/contents/updateStatus";
import { removeContent } from "@/actions/contents/removeContent";
import { CATEGORIES } from "@/constants/categories";
import type { ContentType, ContentStatus, FolderWithCount } from "@/types/database";
import { Loader2, LayoutGrid, List, Archive, Book, Film, Gamepad2, Drama, Music, Filter, ArrowUpDown, ChevronDown, ChevronRight, FolderOpen, Settings, FolderInput, ArrowRight } from "lucide-react";
import { ContentGrid, FilterSelect, FilterChips, Pagination, type FilterOption, type ChipOption } from "@/components/ui";

// 전체 탭에서 카테고리당 최대 표시 개수
const MAX_ITEMS_PER_CATEGORY = 20;

type ViewMode = "grid" | "list";
type ProgressFilter = "all" | "not_started" | "in_progress" | "completed";
type SortOption = "recent" | "title" | "progress_asc" | "progress_desc";

const PROGRESS_OPTIONS: FilterOption<ProgressFilter>[] = [
  { value: "all", label: "전체" },
  { value: "not_started", label: "시작 전" },
  { value: "in_progress", label: "진행 중" },
  { value: "completed", label: "완료" },
];

const SORT_OPTIONS: FilterOption<SortOption>[] = [
  { value: "recent", label: "최근 추가순" },
  { value: "title", label: "제목순" },
  { value: "progress_desc", label: "진행도 높은순" },
  { value: "progress_asc", label: "진행도 낮은순" },
];

// 탭 목록 생성
const TAB_OPTIONS: (ChipOption & { type?: ContentType })[] = [
  { value: "all", label: "전체" },
  ...CATEGORIES.map((cat) => ({
    value: cat.id,
    label: cat.label,
    icon: cat.icon,
    type: cat.dbType as ContentType,
  })),
];

// 카테고리 아이콘 및 라벨
const CATEGORY_INFO: Record<ContentType, { icon: typeof Book; label: string; color: string }> = {
  BOOK: { icon: Book, label: "도서", color: "text-amber-500" },
  VIDEO: { icon: Film, label: "영상", color: "text-red-500" },
  GAME: { icon: Gamepad2, label: "게임", color: "text-cyan-500" },
  PERFORMANCE: { icon: Drama, label: "공연", color: "text-rose-400" },
  MUSIC: { icon: Music, label: "음악", color: "text-green-500" },
};

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
  const [activeTab, setActiveTab] = useState("all");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [contents, setContents] = useState<UserContentWithContent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // 페이지네이션 상태
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // 폴더 상태
  const [folders, setFolders] = useState<Record<ContentType, FolderWithCount[]>>({
    BOOK: [], VIDEO: [], GAME: [], PERFORMANCE: [], MUSIC: [],
  });
  const [folderManagerType, setFolderManagerType] = useState<ContentType | null>(null);

  // 카테고리/폴더 접기 상태
  const [collapsedCategories, setCollapsedCategories] = useState<Set<ContentType>>(new Set());
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(new Set());

  // 필터 & 정렬 상태
  const [progressFilter, setProgressFilter] = useState<ProgressFilter>("all");
  const [sortOption, setSortOption] = useState<SortOption>("recent");

  const toggleCategory = useCallback((type: ContentType) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }, []);

  const toggleFolder = useCallback((folderId: string) => {
    setCollapsedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) next.delete(folderId);
      else next.add(folderId);
      return next;
    });
  }, []);

  // 폴더 로드
  const loadFolders = useCallback(async () => {
    try {
      const allFolders = await getFolders();
      const grouped: Record<ContentType, FolderWithCount[]> = {
        BOOK: [], VIDEO: [], GAME: [], PERFORMANCE: [], MUSIC: [],
      };
      allFolders.forEach((folder) => {
        if (grouped[folder.content_type as ContentType]) {
          grouped[folder.content_type as ContentType].push(folder);
        }
      });
      setFolders(grouped);
    } catch (err) {
      console.error("폴더 로드 실패:", err);
    }
  }, []);

  // 콘텐츠 로드
  const loadContents = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const tab = TAB_OPTIONS.find((t) => t.value === activeTab);

      // 전체 탭: 모든 데이터를 가져와서 클라이언트에서 카테고리별로 나눔
      if (activeTab === "all") {
        const items = await getMyContentsAll();
        setContents(items);
        setTotalPages(1);
        setTotal(items.length);
      } else {
        // 개별 카테고리 탭: 페이지네이션 적용
        const limit = maxItems || 20;
        const result = await getMyContents({
          type: tab?.type,
          page: compact ? 1 : currentPage,
          limit,
        });
        setContents(result.items);
        setTotalPages(result.totalPages);
        setTotal(result.total);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "콘텐츠를 불러오는데 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, currentPage, maxItems, compact]);

  useEffect(() => {
    loadContents();
    if (showFolders) loadFolders();
  }, [loadContents, loadFolders, showFolders]);

  // 탭 변경 시 페이지 리셋
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);

  const handleProgressChange = useCallback((userContentId: string, progress: number) => {
    setContents((prev) =>
      prev.map((item) => {
        if (item.id !== userContentId) return item;
        let newStatus = item.status;
        if (progress === 100) newStatus = "COMPLETE";
        else if (progress > 0 && item.status === "WISH") newStatus = "EXPERIENCE";
        return { ...item, progress, status: newStatus };
      })
    );
    startTransition(async () => {
      try {
        await updateProgress({ userContentId, progress });
      } catch (err) {
        loadContents();
        console.error("진행도 업데이트 실패:", err);
      }
    });
  }, [loadContents]);

  const handleStatusChange = useCallback((userContentId: string, status: ContentStatus) => {
    setContents((prev) =>
      prev.map((item) => (item.id === userContentId ? { ...item, status } : item))
    );
    startTransition(async () => {
      try {
        await updateStatus({ userContentId, status });
      } catch (err) {
        loadContents();
        console.error("상태 업데이트 실패:", err);
      }
    });
  }, [loadContents]);

  const handleDelete = useCallback((userContentId: string) => {
    setContents((prev) => prev.filter((item) => item.id !== userContentId));
    startTransition(async () => {
      try {
        await removeContent(userContentId);
      } catch (err) {
        loadContents();
        console.error("삭제 실패:", err);
      }
    });
  }, [loadContents]);

  const handleMoveToFolder = useCallback(async (userContentId: string, folderId: string | null) => {
    setContents((prev) =>
      prev.map((item) => (item.id === userContentId ? { ...item, folder_id: folderId } : item))
    );
    try {
      await moveToFolder({ userContentIds: [userContentId], folderId });
      loadFolders();
    } catch (err) {
      loadContents();
      console.error("폴더 이동 실패:", err);
    }
  }, [loadContents, loadFolders]);

  // 필터링 및 정렬 적용
  const filteredAndSortedContents = useMemo(() => {
    let result = [...contents];

    if (progressFilter !== "all") {
      result = result.filter((item) => {
        const progress = item.progress ?? 0;
        switch (progressFilter) {
          case "not_started": return progress === 0;
          case "in_progress": return progress > 0 && progress < 100;
          case "completed": return progress === 100;
          default: return true;
        }
      });
    }

    result.sort((a, b) => {
      switch (sortOption) {
        case "title": return (a.content?.title ?? "").localeCompare(b.content?.title ?? "");
        case "progress_asc": return (a.progress ?? 0) - (b.progress ?? 0);
        case "progress_desc": return (b.progress ?? 0) - (a.progress ?? 0);
        default: return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

    return result;
  }, [contents, progressFilter, sortOption]);

  // 전체 탭: 카테고리 > 폴더별 그룹화
  const groupedContents = useMemo(() => {
    if (activeTab !== "all") return null;

    const groups: Record<ContentType, {
      uncategorized: UserContentWithContent[];
      byFolder: Record<string, UserContentWithContent[]>;
    }> = {
      BOOK: { uncategorized: [], byFolder: {} },
      VIDEO: { uncategorized: [], byFolder: {} },
      GAME: { uncategorized: [], byFolder: {} },
      PERFORMANCE: { uncategorized: [], byFolder: {} },
      MUSIC: { uncategorized: [], byFolder: {} },
    };

    filteredAndSortedContents.forEach((item) => {
      const type = item.content.type as ContentType;
      if (!groups[type]) return;

      if (item.folder_id) {
        if (!groups[type].byFolder[item.folder_id]) {
          groups[type].byFolder[item.folder_id] = [];
        }
        groups[type].byFolder[item.folder_id].push(item);
      } else {
        groups[type].uncategorized.push(item);
      }
    });

    return groups;
  }, [activeTab, filteredAndSortedContents]);

  // 개별 카테고리 탭: 폴더별 그룹화
  const folderGroupedContents = useMemo(() => {
    if (activeTab === "all") return null;

    const result: {
      uncategorized: UserContentWithContent[];
      byFolder: Record<string, UserContentWithContent[]>;
    } = { uncategorized: [], byFolder: {} };

    filteredAndSortedContents.forEach((item) => {
      if (item.folder_id) {
        if (!result.byFolder[item.folder_id]) {
          result.byFolder[item.folder_id] = [];
        }
        result.byFolder[item.folder_id].push(item);
      } else {
        result.uncategorized.push(item);
      }
    });

    return result;
  }, [activeTab, filteredAndSortedContents]);

  // 현재 선택된 카테고리의 폴더 목록
  const currentCategoryFolders = useMemo(() => {
    if (activeTab === "all") return [];
    const tab = TAB_OPTIONS.find((t) => t.value === activeTab);
    if (!tab?.type) return [];
    return folders[tab.type] || [];
  }, [activeTab, folders]);

  // 폴더 이름 조회 헬퍼
  const getFolderName = useCallback((folderId: string, contentType: ContentType) => {
    const folder = folders[contentType]?.find((f) => f.id === folderId);
    return folder?.name || "알 수 없는 폴더";
  }, [folders]);

  // 콘텐츠 렌더링 헬퍼
  const renderContentItems = (items: UserContentWithContent[]) => {
    if (viewMode === "grid") {
      return (
        <ContentGrid compact={compact} minWidth={compact ? 100 : 130}>
          {items.map((item) => (
            <ContentCard
              key={item.id}
              item={item}
              onProgressChange={handleProgressChange}
              onStatusChange={handleStatusChange}
              onDelete={handleDelete}
              href={`/archive/${item.content_id}`}
              compact={compact}
            />
          ))}
        </ContentGrid>
      );
    }
    return (
      <div className={`flex flex-col ${compact ? "gap-1.5" : "gap-2"}`}>
        {items.map((item) => (
          <ContentListItem
            key={item.id}
            item={item}
            onProgressChange={handleProgressChange}
            onStatusChange={handleStatusChange}
            onDelete={handleDelete}
            href={`/archive/${item.content_id}`}
            compact={compact}
          />
        ))}
      </div>
    );
  };

  // 폴더 서브그룹 렌더링
  const renderFolderSubgroup = (
    folderId: string,
    items: UserContentWithContent[],
    contentType: ContentType
  ) => {
    const isCollapsed = collapsedFolders.has(folderId);
    const folderName = getFolderName(folderId, contentType);

    return (
      <div key={folderId} className="ml-4 mt-2">
        <button
          onClick={() => toggleFolder(folderId)}
          className="flex items-center gap-1.5 mb-2 text-left cursor-pointer group"
        >
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
          <FolderOpen size={14} className="text-text-secondary" />
          <span className="text-xs font-medium text-text-secondary">{folderName}</span>
          <span className="text-xs text-text-secondary/60">({items.length})</span>
        </button>
        {!isCollapsed && <div className="ml-4">{renderContentItems(items)}</div>}
      </div>
    );
  };

  // 미분류 서브그룹 렌더링
  const renderUncategorizedSubgroup = (items: UserContentWithContent[]) => {
    if (items.length === 0) return null;
    const key = "uncategorized";
    const isCollapsed = collapsedFolders.has(key);

    return (
      <div className="ml-4 mt-2">
        <button
          onClick={() => toggleFolder(key)}
          className="flex items-center gap-1.5 mb-2 text-left cursor-pointer group"
        >
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
          <FolderInput size={14} className="text-text-secondary" />
          <span className="text-xs font-medium text-text-secondary">미분류</span>
          <span className="text-xs text-text-secondary/60">({items.length})</span>
        </button>
        {!isCollapsed && <div className="ml-4">{renderContentItems(items)}</div>}
      </div>
    );
  };

  return (
    <div>
      {/* 카테고리 탭 + 필터 통합 영역 */}
      <div className={`flex flex-col gap-3 ${compact ? "mb-3" : "mb-4"}`}>
        {(showTabs || showViewToggle) && (
          <div className="flex items-center justify-between gap-2">
            {showTabs && (
              <div className="flex-1 overflow-x-auto pb-1 -mb-1">
                <FilterChips
                  options={TAB_OPTIONS}
                  value={activeTab}
                  onChange={setActiveTab}
                  variant="filled"
                  compact={compact}
                  showIcon={!compact}
                />
              </div>
            )}
            {showViewToggle && (
              <div className="flex items-center gap-1">
                {/* 폴더 관리 버튼 (개별 카테고리에서만) */}
                {showFolders && activeTab !== "all" && (
                  <button
                    onClick={() => {
                      const tab = TAB_OPTIONS.find((t) => t.value === activeTab);
                      if (tab?.type) setFolderManagerType(tab.type);
                    }}
                    className="p-1.5 rounded hover:bg-bg-secondary text-text-secondary hover:text-text-primary transition-colors"
                    title="폴더 관리"
                  >
                    <Settings size={16} />
                  </button>
                )}
                <div className="flex bg-bg-secondary rounded-md p-0.5">
                  <button
                    onClick={() => setViewMode("grid")}
                    className={`py-1 px-2 rounded cursor-pointer transition-all ${
                      viewMode === "grid" ? "bg-bg-card text-text-primary" : "text-text-secondary hover:text-text-primary"
                    }`}
                    aria-label="그리드 뷰"
                  >
                    <LayoutGrid size={compact ? 14 : 16} />
                  </button>
                  <button
                    onClick={() => setViewMode("list")}
                    className={`py-1 px-2 rounded cursor-pointer transition-all ${
                      viewMode === "list" ? "bg-bg-card text-text-primary" : "text-text-secondary hover:text-text-primary"
                    }`}
                    aria-label="리스트 뷰"
                  >
                    <List size={compact ? 14 : 16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {showFilters && (
          <div className="flex gap-2">
            <FilterSelect
              options={PROGRESS_OPTIONS}
              value={progressFilter}
              onChange={setProgressFilter}
              icon={Filter}
              compact={compact}
              defaultValue="all"
            />
            <FilterSelect
              options={SORT_OPTIONS}
              value={sortOption}
              onChange={setSortOption}
              icon={ArrowUpDown}
              compact={compact}
              defaultValue="recent"
            />
          </div>
        )}
      </div>

      {/* Error State */}
      {error && (
        <div className={`text-center ${compact ? "py-4" : "py-8"}`}>
          <p className="text-red-400 mb-2 text-xs">{error}</p>
          <button onClick={loadContents} className="text-accent hover:underline text-xs">
            다시 시도
          </button>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className={`flex items-center justify-center ${compact ? "py-8" : "py-12"}`}>
          <Loader2 size={compact ? 20 : 28} className="animate-spin text-accent" />
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && contents.length === 0 && (
        <div className={`text-center ${compact ? "py-6" : "py-12"}`}>
          <Archive size={compact ? 32 : 48} className="mx-auto mb-2 text-text-secondary opacity-50" />
          <p className="text-text-secondary text-xs">{emptyMessage}</p>
        </div>
      )}

      {!isLoading && !error && contents.length > 0 && filteredAndSortedContents.length === 0 && (
        <div className={`text-center ${compact ? "py-6" : "py-12"}`}>
          <Archive size={compact ? 32 : 48} className="mx-auto mb-2 text-text-secondary opacity-50" />
          <p className="text-text-secondary text-xs">필터 조건에 맞는 콘텐츠가 없습니다</p>
        </div>
      )}

      {/* Content - 전체 탭: 카테고리별 최대 20개 + 더보기 */}
      {!isLoading && !error && filteredAndSortedContents.length > 0 && activeTab === "all" && groupedContents && (
        <div className="space-y-5">
          {(Object.entries(groupedContents) as [ContentType, typeof groupedContents[ContentType]][]).map(([type, group]) => {
            // 해당 카테고리의 모든 아이템을 합침
            const allItems = [...Object.values(group.byFolder).flat(), ...group.uncategorized];
            const totalItems = allItems.length;
            if (totalItems === 0) return null;

            const info = CATEGORY_INFO[type];
            const Icon = info.icon;
            const isCollapsed = collapsedCategories.has(type);
            const hasMore = totalItems > MAX_ITEMS_PER_CATEGORY;
            const displayItems = allItems.slice(0, MAX_ITEMS_PER_CATEGORY);

            // 해당 카테고리 탭의 value 찾기
            const categoryTab = TAB_OPTIONS.find((t) => t.type === type);

            return (
              <div key={type}>
                <button
                  onClick={() => toggleCategory(type)}
                  className="flex items-center gap-2 mb-3 w-full text-left cursor-pointer group"
                >
                  <div className={`flex items-center gap-1.5 ${info.color}`}>
                    {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                    <Icon size={16} />
                    <h3 className="text-sm font-bold">{info.label}</h3>
                  </div>
                  <span className="text-xs text-text-secondary">({totalItems})</span>
                  <div className="flex-1 h-px bg-border ml-2 group-hover:bg-text-secondary/30 transition-colors" />
                </button>

                {!isCollapsed && (
                  <div>
                    {renderContentItems(displayItems)}
                    {/* 더보기 버튼 */}
                    {hasMore && categoryTab && (
                      <button
                        onClick={() => setActiveTab(categoryTab.value)}
                        className="mt-3 flex items-center gap-1 mx-auto px-3 py-1.5 text-xs text-accent hover:text-accent-hover transition-colors"
                      >
                        <span>더보기 ({totalItems - MAX_ITEMS_PER_CATEGORY}개 더)</span>
                        <ArrowRight size={14} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Content - 개별 카테고리 탭: 폴더별 그룹화 */}
      {!isLoading && !error && filteredAndSortedContents.length > 0 && activeTab !== "all" && folderGroupedContents && (
        <div>
          {currentCategoryFolders.length > 0 && showFolders ? (
            <>
              {currentCategoryFolders.map((folder) => {
                const items = folderGroupedContents.byFolder[folder.id] || [];
                if (items.length === 0) return null;
                const tab = TAB_OPTIONS.find((t) => t.value === activeTab);
                return renderFolderSubgroup(folder.id, items, tab?.type as ContentType);
              })}
              {renderUncategorizedSubgroup(folderGroupedContents.uncategorized)}
            </>
          ) : (
            renderContentItems(filteredAndSortedContents)
          )}
        </div>
      )}

      {/* 페이지네이션 - 개별 카테고리 탭에서만 표시 */}
      {!compact && showPagination && !isLoading && totalPages > 1 && activeTab !== "all" && (
        <div className="mt-6 flex justify-center">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
      )}

      {/* 폴더 관리 모달 */}
      {folderManagerType && (
        <FolderManager
          contentType={folderManagerType}
          folders={folders[folderManagerType] || []}
          onFoldersChange={() => {
            loadFolders();
            loadContents();
          }}
          onClose={() => setFolderManagerType(null)}
        />
      )}
    </div>
  );
}
