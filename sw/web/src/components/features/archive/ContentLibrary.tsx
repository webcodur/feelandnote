"use client";

import { useState, useEffect, useCallback, useTransition, useMemo, useRef } from "react";
import { ContentCard } from "@/components/features/cards";
import ContentListItem from "./ContentListItem";
import { getMyContents, type UserContentWithContent } from "@/actions/contents/getMyContents";
import { updateProgress } from "@/actions/contents/updateProgress";
import { updateStatus } from "@/actions/contents/updateStatus";
import { removeContent } from "@/actions/contents/removeContent";
import { CATEGORIES } from "@/constants/categories";
import type { ContentType, ContentStatus } from "@/types/database";
import { Loader2, LayoutGrid, List, Archive, ChevronDown, Check, Book, Film, Gamepad2, Drama, Music, Filter, ArrowUpDown } from "lucide-react";
import { ContentGrid } from "@/components/ui";

type ViewMode = "grid" | "list";
type ProgressFilter = "all" | "not_started" | "in_progress" | "completed";
type SortOption = "recent" | "title" | "progress_asc" | "progress_desc";

const PROGRESS_OPTIONS: { value: ProgressFilter; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "not_started", label: "시작 전" },
  { value: "in_progress", label: "진행 중" },
  { value: "completed", label: "완료" },
];

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "recent", label: "최근 추가순" },
  { value: "title", label: "제목순" },
  { value: "progress_desc", label: "진행도 높은순" },
  { value: "progress_asc", label: "진행도 낮은순" },
];

// 탭 목록 생성
const TABS: { id: string; label: string; type?: ContentType }[] = [
  { id: "all", label: "전체" },
  ...CATEGORIES.map((cat) => ({
    id: cat.id,
    label: cat.label,
    type: cat.dbType as ContentType,
  })),
];

// 카테고리 아이콘 맵
const CATEGORY_ICON_MAP = Object.fromEntries(
  CATEGORIES.map((cat) => [cat.id, cat.icon])
);

function getIconForTab(tabId: string) {
  const Icon = CATEGORY_ICON_MAP[tabId];
  return Icon ? <Icon size={14} /> : null;
}

interface ContentLibraryProps {
  /** 컴팩트 모드 (대시보드용) */
  compact?: boolean;
  /** 최대 표시 개수 (compact 모드에서 사용) */
  maxItems?: number;
  /** 카테고리 탭 표시 여부 */
  showTabs?: boolean;
  /** 필터/정렬 표시 여부 */
  showFilters?: boolean;
  /** 뷰 모드 토글 표시 여부 */
  showViewToggle?: boolean;
  /** 빈 상태 메시지 */
  emptyMessage?: string;
}

export default function ContentLibrary({
  compact = false,
  maxItems,
  showTabs = true,
  showFilters = true,
  showViewToggle = true,
  emptyMessage = "아직 기록한 콘텐츠가 없습니다",
}: ContentLibraryProps) {
  const [activeTab, setActiveTab] = useState("all");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [contents, setContents] = useState<UserContentWithContent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // 필터 & 정렬 상태
  const [progressFilter, setProgressFilter] = useState<ProgressFilter>("all");
  const [sortOption, setSortOption] = useState<SortOption>("recent");
  const [showProgressDropdown, setShowProgressDropdown] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);

  const progressDropdownRef = useRef<HTMLDivElement>(null);
  const sortDropdownRef = useRef<HTMLDivElement>(null);

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (progressDropdownRef.current && !progressDropdownRef.current.contains(event.target as Node)) {
        setShowProgressDropdown(false);
      }
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(event.target as Node)) {
        setShowSortDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const loadContents = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const tab = TABS.find((t) => t.id === activeTab);
      const data = await getMyContents({ type: tab?.type });
      setContents(maxItems ? data.slice(0, maxItems) : data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "콘텐츠를 불러오는데 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, maxItems]);

  useEffect(() => {
    loadContents();
  }, [loadContents]);

  const handleProgressChange = useCallback((userContentId: string, progress: number) => {
    // 낙관적 업데이트
    setContents((prev) =>
      prev.map((item) => {
        if (item.id !== userContentId) return item;
        let newStatus = item.status;
        if (progress === 100) {
          newStatus = "COMPLETE";
        } else if (progress > 0 && item.status === "WISH") {
          newStatus = "EXPERIENCE";
        }
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
    // 낙관적 업데이트
    setContents((prev) =>
      prev.map((item) =>
        item.id === userContentId ? { ...item, status } : item
      )
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
    // 낙관적 업데이트
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

  // 필터링 및 정렬 적용
  const filteredAndSortedContents = useMemo(() => {
    let result = [...contents];

    // 진행도 필터
    if (progressFilter !== "all") {
      result = result.filter((item) => {
        const progress = item.progress ?? 0;
        switch (progressFilter) {
          case "not_started":
            return progress === 0;
          case "in_progress":
            return progress > 0 && progress < 100;
          case "completed":
            return progress === 100;
          default:
            return true;
        }
      });
    }

    // 정렬
    result.sort((a, b) => {
      switch (sortOption) {
        case "title":
          return (a.content?.title ?? "").localeCompare(b.content?.title ?? "");
        case "progress_asc":
          return (a.progress ?? 0) - (b.progress ?? 0);
        case "progress_desc":
          return (b.progress ?? 0) - (a.progress ?? 0);
        case "recent":
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

    return result;
  }, [contents, progressFilter, sortOption]);

  const currentProgressLabel = PROGRESS_OPTIONS.find((o) => o.value === progressFilter)?.label ?? "진행도";
  const currentSortLabel = SORT_OPTIONS.find((o) => o.value === sortOption)?.label ?? "정렬";

  // 전체 탭일 때 카테고리별 그룹화
  const groupedContents = useMemo(() => {
    if (activeTab !== "all") return null;

    const groups: Record<ContentType, UserContentWithContent[]> = {
      BOOK: [],
      VIDEO: [],
      GAME: [],
      PERFORMANCE: [],
      MUSIC: [],
    };

    filteredAndSortedContents.forEach((item) => {
      const type = item.content.type as ContentType;
      if (groups[type]) {
        groups[type].push(item);
      }
    });

    return groups;
  }, [activeTab, filteredAndSortedContents]);

  // 카테고리 아이콘 및 라벨
  const CATEGORY_INFO: Record<ContentType, { icon: typeof Book; label: string; color: string }> = {
    BOOK: { icon: Book, label: "도서", color: "text-amber-500" },
    VIDEO: { icon: Film, label: "영상", color: "text-red-500" },
    GAME: { icon: Gamepad2, label: "게임", color: "text-cyan-500" },
    PERFORMANCE: { icon: Drama, label: "공연", color: "text-rose-400" },
    MUSIC: { icon: Music, label: "음악", color: "text-green-500" },
  };

  // 컴팩트 모드 스타일
  const tabStyle = compact
    ? "text-xs py-1 px-2 rounded"
    : "text-sm py-2 px-4 rounded-lg";

  return (
    <div>
      {/* 카테고리 탭 */}
      {showTabs && (
        <div className={`flex gap-2 ${compact ? "mb-3 overflow-x-auto pb-2" : "border-b border-border pb-4 mb-6"}`}>
          {TABS.map((tab) => (
            <button
              key={tab.id}
              className={`font-medium cursor-pointer transition-all duration-200 flex items-center gap-1 whitespace-nowrap
                ${tabStyle}
                ${activeTab === tab.id
                  ? "text-text-primary bg-bg-secondary"
                  : "text-text-secondary hover:text-text-primary hover:bg-white/5"
                }`}
              onClick={() => setActiveTab(tab.id)}
            >
              {!compact && getIconForTab(tab.id)} {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* 필터 & 뷰 토글 */}
      {(showFilters || showViewToggle) && (
        <div className={`flex justify-between items-center ${compact ? "mb-3" : "mb-6"}`}>
          {showFilters && (
            <div className="flex gap-2">
              {/* 진행도 필터 드롭다운 */}
              <div className="relative" ref={progressDropdownRef}>
                <button
                  onClick={() => {
                    setShowProgressDropdown(!showProgressDropdown);
                    setShowSortDropdown(false);
                  }}
                  className={`bg-bg-secondary border border-border text-text-secondary rounded-md cursor-pointer transition-all duration-200 hover:border-text-secondary hover:text-text-primary flex items-center gap-1.5 ${compact ? "py-1 px-2 text-[11px]" : "py-1.5 px-3 text-[13px]"} ${progressFilter !== "all" ? "border-accent text-accent" : ""}`}
                >
                  <Filter size={compact ? 12 : 14} />
                  {currentProgressLabel}
                  <ChevronDown size={compact ? 12 : 14} className={`transition-transform ${showProgressDropdown ? "rotate-180" : ""}`} />
                </button>
                {showProgressDropdown && (
                  <div className="absolute top-full left-0 mt-1 bg-bg-card border border-border rounded-md shadow-lg z-30 min-w-[120px] py-1">
                    {PROGRESS_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => {
                          setProgressFilter(option.value);
                          setShowProgressDropdown(false);
                        }}
                        className={`w-full text-left px-3 py-1.5 text-[13px] hover:bg-bg-secondary transition-colors flex items-center justify-between ${progressFilter === option.value ? "text-accent" : "text-text-secondary"}`}
                      >
                        {option.label}
                        {progressFilter === option.value && <Check size={14} />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 정렬 드롭다운 */}
              <div className="relative" ref={sortDropdownRef}>
                <button
                  onClick={() => {
                    setShowSortDropdown(!showSortDropdown);
                    setShowProgressDropdown(false);
                  }}
                  className={`bg-bg-secondary border border-border text-text-secondary rounded-md cursor-pointer transition-all duration-200 hover:border-text-secondary hover:text-text-primary flex items-center gap-1.5 ${compact ? "py-1 px-2 text-[11px]" : "py-1.5 px-3 text-[13px]"} ${sortOption !== "recent" ? "border-accent text-accent" : ""}`}
                >
                  <ArrowUpDown size={compact ? 12 : 14} />
                  {currentSortLabel}
                  <ChevronDown size={compact ? 12 : 14} className={`transition-transform ${showSortDropdown ? "rotate-180" : ""}`} />
                </button>
                {showSortDropdown && (
                  <div className="absolute top-full left-0 mt-1 bg-bg-card border border-border rounded-md shadow-lg z-30 min-w-[140px] py-1">
                    {SORT_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => {
                          setSortOption(option.value);
                          setShowSortDropdown(false);
                        }}
                        className={`w-full text-left px-3 py-1.5 text-[13px] hover:bg-bg-secondary transition-colors flex items-center justify-between ${sortOption === option.value ? "text-accent" : "text-text-secondary"}`}
                      >
                        {option.label}
                        {sortOption === option.value && <Check size={14} />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          {!showFilters && <div />}
          {showViewToggle && (
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
          )}
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className={`text-center ${compact ? "py-6" : "py-12"}`}>
          <p className="text-red-400 mb-4 text-sm">{error}</p>
          <button onClick={loadContents} className="text-accent hover:underline text-sm">
            다시 시도
          </button>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className={`flex items-center justify-center ${compact ? "py-10" : "py-20"}`}>
          <Loader2 size={compact ? 24 : 32} className="animate-spin text-accent" />
        </div>
      )}

      {/* Empty State - 원본 데이터가 비어있을 때 */}
      {!isLoading && !error && contents.length === 0 && (
        <div className={`text-center ${compact ? "py-10" : "py-20"}`}>
          <Archive size={compact ? 40 : 64} className="mx-auto mb-4 text-text-secondary opacity-50" />
          <p className="text-text-secondary text-sm">{emptyMessage}</p>
        </div>
      )}

      {/* Empty State - 필터 결과가 비어있을 때 */}
      {!isLoading && !error && contents.length > 0 && filteredAndSortedContents.length === 0 && (
        <div className={`text-center ${compact ? "py-10" : "py-20"}`}>
          <Archive size={compact ? 40 : 64} className="mx-auto mb-4 text-text-secondary opacity-50" />
          <p className="text-text-secondary text-sm">필터 조건에 맞는 콘텐츠가 없습니다</p>
        </div>
      )}

      {/* Content Grid View - 전체 탭: 카테고리별 그룹화 */}
      {!isLoading && !error && filteredAndSortedContents.length > 0 && viewMode === "grid" && activeTab === "all" && groupedContents && (
        <div className="space-y-8">
          {(Object.entries(groupedContents) as [ContentType, UserContentWithContent[]][]).map(([type, items]) => {
            if (items.length === 0) return null;
            const info = CATEGORY_INFO[type];
            const Icon = info.icon;

            return (
              <div key={type}>
                {/* 카테고리 헤더 */}
                <div className="flex items-center gap-3 mb-4">
                  <div className={`flex items-center gap-2 ${info.color}`}>
                    <Icon size={20} />
                    <h3 className="text-lg font-bold">{info.label}</h3>
                  </div>
                  <span className="text-sm text-text-secondary">({items.length})</span>
                  <div className="flex-1 h-px bg-border ml-2" />
                </div>

                {/* 카테고리별 그리드 */}
                <ContentGrid compact={compact} minWidth={compact ? 140 : 200}>
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
              </div>
            );
          })}
        </div>
      )}

      {/* Content Grid View - 개별 카테고리 탭 */}
      {!isLoading && !error && filteredAndSortedContents.length > 0 && viewMode === "grid" && activeTab !== "all" && (
        <ContentGrid compact={compact} minWidth={compact ? 140 : 200}>
          {filteredAndSortedContents.map((item) => (
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
      )}

      {/* Content List View */}
      {!isLoading && !error && filteredAndSortedContents.length > 0 && viewMode === "list" && (
        <div className={`flex flex-col ${compact ? "gap-2" : "gap-3"}`}>
          {filteredAndSortedContents.map((item) => (
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
      )}
    </div>
  );
}
