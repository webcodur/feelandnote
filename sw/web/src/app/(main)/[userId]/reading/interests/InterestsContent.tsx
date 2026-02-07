"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { getMyContents, type UserContentWithContent } from "@/actions/contents/getMyContents";
import { getUserContents } from "@/actions/contents/getUserContents";
import { getWantContentCounts, getUserWantContentCounts } from "@/actions/contents/getContentCounts";
import { checkContentsSaved } from "@/actions/contents/getMyContentIds";
import { removeContent } from "@/actions/contents/removeContent";
import { addContent } from "@/actions/contents/addContent";
import { CATEGORY_ID_TO_TYPE, getCategoryByDbType, type CategoryId } from "@/constants/categories";
import type { ContentType, ContentStatus } from "@/types/database";
import type { ContentTypeCounts } from "@/types/content";
import { ContentCard } from "@/components/ui/cards";
import InterestsControlBar, { type InterestSortOption } from "./InterestsControlBar";
import InterestsReviewModal from "./InterestsReviewModal";
import { Inbox, SlidersHorizontal } from "lucide-react";
import ClassicalBox from "@/components/ui/ClassicalBox";
import ContentGrid from "@/components/ui/ContentGrid";
import { InnerBox, Pagination } from "@/components/ui";
import ControlPanel from "@/components/shared/ControlPanel";

interface InterestsContentProps {
  userId: string;
  isOwner: boolean;
}

export default function InterestsContent({ userId, isOwner }: InterestsContentProps) {
  const [activeTab, setActiveTab] = useState<CategoryId>("book");
  const [contents, setContents] = useState<UserContentWithContent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortOption, setSortOption] = useState<InterestSortOption>("recent");

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [typeCounts, setTypeCounts] = useState<ContentTypeCounts>({
    BOOK: 0, VIDEO: 0, GAME: 0, MUSIC: 0, CERTIFICATE: 0,
  });

  // 뷰어 모드: 보유 콘텐츠 체크 (null = 비로그인)
  const [savedContentIds, setSavedContentIds] = useState<Set<string> | null>(null);

  // 모달 상태
  const [selectedContent, setSelectedContent] = useState<UserContentWithContent | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

  // ControlPanel 상태
  const [isControlsExpanded, setIsControlsExpanded] = useState(false);

  // 검색 상태
  const [searchQuery, setSearchQuery] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");

  // 데이터 로딩
  const loadContents = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (isOwner) {
        const result = await getMyContents({
          type: CATEGORY_ID_TO_TYPE[activeTab],
          status: "WANT",
          page: currentPage,
          limit: 10,
          search: appliedSearch || undefined,
        });
        setContents(result.items);
        setTotalPages(result.totalPages);
        setTotal(result.total);
      } else {
        const result = await getUserContents({
          userId,
          type: CATEGORY_ID_TO_TYPE[activeTab],
          status: "WANT",
          page: currentPage,
          limit: 10,
        });
        const mapped: UserContentWithContent[] = result.items.map((item) => ({
          id: item.id,
          content_id: item.content_id,
          user_id: userId,
          status: item.status as ContentStatus,
          visibility: item.visibility ?? "public",
          created_at: item.created_at,
          updated_at: item.created_at,
          completed_at: null,
          rating: null,
          review: null,
          is_recommended: false,
          is_spoiler: false,
          is_pinned: false,
          pinned_at: null,
          source_url: item.source_url,
          content: {
            id: item.content.id,
            type: item.content.type as ContentType,
            title: item.content.title,
            creator: item.content.creator,
            thumbnail_url: item.content.thumbnail_url,
            description: null,
            publisher: null,
            release_date: null,
            metadata: item.content.metadata,
            user_count: item.content.user_count ?? null,
          },
        }));
        setContents(mapped);
        setTotalPages(result.totalPages);
        setTotal(result.total);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "콘텐츠를 불러오는데 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, currentPage, isOwner, userId, appliedSearch]);

  const loadTypeCounts = useCallback(async () => {
    try {
      const counts = isOwner
        ? await getWantContentCounts()
        : await getUserWantContentCounts(userId);
      setTypeCounts(counts);
    } catch (err) {
      console.error("타입별 개수 로드 실패:", err);
    }
  }, [isOwner, userId]);

  useEffect(() => {
    loadContents();
    loadTypeCounts();
  }, [loadContents, loadTypeCounts]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);

  // 뷰어 모드: 콘텐츠 로드 후 보유 여부 배치 체크
  useEffect(() => {
    if (isOwner || contents.length === 0) {
      setSavedContentIds(null);
      return;
    }
    checkContentsSaved(contents.map(c => c.content_id)).then(setSavedContentIds);
  }, [isOwner, contents]);

  // 정렬된 콘텐츠
  const sortedContents = useMemo(() => {
    if (sortOption === "title") {
      return [...contents].sort((a, b) => a.content.title.localeCompare(b.content.title, "ko"));
    }
    return contents;
  }, [contents, sortOption]);

  // 카드 클릭 → 모달 열기
  const handleCardClick = useCallback((item: UserContentWithContent) => {
    setSelectedContent(item);
    setIsReviewModalOpen(true);
  }, []);

  // 모달에서 저장 완료 시
  const handleReviewSaved = useCallback(() => {
    loadContents();
    loadTypeCounts();
  }, [loadContents, loadTypeCounts]);

  // 모달 닫기
  const handleModalClose = useCallback(() => {
    setIsReviewModalOpen(false);
    setSelectedContent(null);
  }, []);

  // 삭제 핸들러
  const handleDelete = useCallback(async (userContentId: string, title: string) => {
    if (!window.confirm(`'${title}'을(를) 관심 목록에서 삭제할까요?`)) return;

    try {
      await removeContent(userContentId);
      loadContents();
      loadTypeCounts();
    } catch (err) {
      console.error("삭제 실패:", err);
      alert("삭제에 실패했습니다.");
    }
  }, [loadContents, loadTypeCounts]);

  // 콘텐츠 추가 핸들러 (뷰어 모드)
  const handleAddContent = useCallback(async (item: UserContentWithContent) => {
    const result = await addContent({
      id: item.content_id,
      type: item.content.type,
      title: item.content.title,
      creator: item.content.creator ?? undefined,
      thumbnailUrl: item.content.thumbnail_url ?? undefined,
      status: "WANT",
    });
    if (result.success) {
      setSavedContentIds(prev => {
        const next = new Set(prev ?? []);
        next.add(item.content_id);
        return next;
      });
    }
  }, []);

  // 검색 핸들러
  const handleSearch = useCallback(() => {
    if (searchQuery.trim().length >= 2) {
      setAppliedSearch(searchQuery.trim());
      setCurrentPage(1);
    }
  }, [searchQuery]);

  const handleClearSearch = useCallback(() => {
    setSearchQuery("");
    setAppliedSearch("");
    setCurrentPage(1);
  }, []);

  // 렌더링
  const renderContent = () => {
    if (isLoading) {
      return (
        <ContentGrid>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-bg-card rounded-lg h-[140px] animate-shimmer" />
          ))}
        </ContentGrid>
      );
    }

    if (error) {
      return (
        <div className="text-center py-12 text-red-400">
          <p>{error}</p>
        </div>
      );
    }

    if (sortedContents.length === 0) {
      return (
        <div className="text-center py-16">
          <Inbox size={48} className="mx-auto mb-4 text-text-tertiary opacity-50" />
          <p className="text-text-secondary">
            {appliedSearch ? `'${appliedSearch}'에 대한 검색 결과가 없습니다.` : "아직 관심 콘텐츠가 없습니다."}
          </p>
        </div>
      );
    }

    return (
      <>
        <ContentGrid>
          {sortedContents.map((item) => (
            <ContentCard
              key={item.id}
              contentId={item.content_id}
              contentType={item.content.type}
              title={item.content.title}
              creator={item.content.creator}
              thumbnail={item.content.thumbnail_url}
              href={isOwner ? undefined : `/content/${item.content_id}?category=${getCategoryByDbType(item.content.type)?.id || "book"}`}
              onClick={isOwner ? () => handleCardClick(item) : undefined}
              deletable={isOwner}
              onDelete={isOwner ? () => handleDelete(item.id, item.content.title) : undefined}
              saved={!isOwner && savedContentIds !== null && savedContentIds.has(item.content_id)}
              addable={!isOwner && savedContentIds !== null && !savedContentIds.has(item.content_id)}
              onAdd={() => handleAddContent(item)}
            />
          ))}
        </ContentGrid>

        <hr className="border-white/10 mt-6" />
        <div className="mt-6">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
      </>
    );
  };

  return (
    <div className="w-full">
      {/* 제어 패널 */}
      <ControlPanel
        title="관심 제어"
        icon={<SlidersHorizontal size={16} className="text-accent/70" />}
        isExpanded={isControlsExpanded}
        onToggleExpand={() => setIsControlsExpanded(!isControlsExpanded)}
        className="mb-6 sticky top-0 z-30 max-w-2xl mx-auto"
      >
        <div className="px-6 py-4 flex justify-center items-center">
          <InterestsControlBar
            activeTab={activeTab}
            onTabChange={setActiveTab}
            typeCounts={typeCounts}
            total={total}
            sortOption={sortOption}
            onSortChange={setSortOption}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onSearch={handleSearch}
            onClearSearch={handleClearSearch}
          />
        </div>
      </ControlPanel>

      {/* 콘텐츠 목록 */}
      <ClassicalBox className="p-4 sm:p-6 md:p-8 bg-bg-card/50 shadow-2xl border-accent-dim/20">
        {renderContent()}
      </ClassicalBox>

      {/* 리뷰 모달 (소유자만) */}
      {isOwner && (
        <InterestsReviewModal
          selectedContent={selectedContent}
          isOpen={isReviewModalOpen}
          onClose={handleModalClose}
          onSaved={handleReviewSaved}
        />
      )}
    </div>
  );
}
