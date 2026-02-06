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
import InterestsEditPanel from "./InterestsEditPanel";
import { Inbox } from "lucide-react";
import { CertificateCard } from "@/components/ui/cards";
import ClassicalBox from "@/components/ui/ClassicalBox";
import { DecorativeLabel, InnerBox, Pagination } from "@/components/ui";

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

  // 선택된 콘텐츠 상태
  const [selectedContentId, setSelectedContentId] = useState<string | null>(null);

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
        });
        setContents(result.items);
        setTotalPages(result.totalPages);
        setTotal(result.total);
      } else {
        // 뷰어 모드: 타인의 공개 WANT 콘텐츠 조회
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
  }, [activeTab, currentPage, isOwner, userId]);

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
    return contents; // recent는 이미 서버에서 정렬됨
  }, [contents, sortOption]);

  // 선택된 콘텐츠 객체
  const selectedContent = useMemo(
    () => contents.find((c) => c.id === selectedContentId) ?? null,
    [contents, selectedContentId]
  );

  // 카드 선택 핸들러
  const handleSelect = useCallback((contentId: string) => {
    setSelectedContentId((prev) => (prev === contentId ? null : contentId));
  }, []);

  // 편집 패널에서 저장 완료 시
  const handleEditSaved = useCallback(() => {
    loadContents();
    loadTypeCounts();
  }, [loadContents, loadTypeCounts]);

  // 편집 패널 닫기
  const handleEditClose = useCallback(() => {
    setSelectedContentId(null);
  }, []);

  // 삭제 핸들러
  const handleDelete = useCallback(async (userContentId: string, title: string) => {
    if (!window.confirm(`'${title}'을(를) 관심 목록에서 삭제할까요?`)) return;

    try {
      await removeContent(userContentId);
      loadContents();
      loadTypeCounts();
      if (selectedContentId === userContentId) {
        setSelectedContentId(null);
      }
    } catch (err) {
      console.error("삭제 실패:", err);
      alert("삭제에 실패했습니다.");
    }
  }, [loadContents, loadTypeCounts, selectedContentId]);

  // 콘텐츠 추가 핸들러 (뷰어 모드: addable 클릭)
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

  // 렌더링
  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-bg-card rounded-lg h-[140px] animate-shimmer" />
          ))}
        </div>
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
          <p className="text-text-secondary">아직 관심 콘텐츠가 없습니다.</p>
        </div>
      );
    }

    // 자격증과 일반 콘텐츠 분리
    const certificates = sortedContents.filter((item) => item.content.type === "CERTIFICATE");
    const regularContents = sortedContents.filter((item) => item.content.type !== "CERTIFICATE");

    return (
      <ClassicalBox className="p-4 sm:p-6 md:p-8 bg-bg-card/50 shadow-2xl border-accent-dim/20">
        <div className="flex justify-center mb-6">
          <DecorativeLabel label="관심 목록" />
        </div>
        <InnerBox className="mb-6 p-3 sticky top-0 z-30 backdrop-blur-sm flex justify-center items-center">
          <InterestsControlBar
            activeTab={activeTab}
            onTabChange={setActiveTab}
            typeCounts={typeCounts}
            total={total}
            sortOption={sortOption}
            onSortChange={setSortOption}
          />
        </InnerBox>

        <div className="space-y-4">
          {regularContents.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {regularContents.map((item) => (
                <ContentCard
                  key={item.id}
                  contentId={item.content_id}
                  contentType={item.content.type}
                  title={item.content.title}
                  creator={item.content.creator}
                  thumbnail={item.content.thumbnail_url}
                  href={`/content/${item.content_id}?category=${getCategoryByDbType(item.content.type)?.id || "book"}`}
                  // 본인: 선택 + 삭제
                  selectable={isOwner}
                  isSelected={isOwner && selectedContentId === item.id}
                  onSelect={isOwner ? () => handleSelect(item.id) : undefined}
                  deletable={isOwner}
                  onDelete={isOwner ? () => handleDelete(item.id, item.content.title) : undefined}
                  // 타인(로그인) + 보유 → 북마크(채움)
                  saved={!isOwner && savedContentIds !== null && savedContentIds.has(item.content_id)}
                  // 타인(로그인) + 미보유 → 북마크(빈)
                  addable={!isOwner && savedContentIds !== null && !savedContentIds.has(item.content_id)}
                  onAdd={() => handleAddContent(item)}
                />
              ))}
            </div>
          )}

          {certificates.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {certificates.map((item) => (
                <CertificateCard
                  key={item.id}
                  item={item}
                  onStatusChange={() => {}}
                  onRecommendChange={() => {}}
                  onDelete={() => {}}
                  href={`/content/${item.content_id}?category=certificate`}
                  isBatchMode={false}
                  isSelected={false}
                  readOnly={!isOwner}
                />
              ))}
            </div>
          )}
        </div>

        <hr className="border-white/10 mt-6" />
        <div className="mt-6">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
      </ClassicalBox>
    );
  };

  return (
    <div className="w-full">
      {/* 편집 영역 (소유자만 표시) */}
      {isOwner && (
        <InterestsEditPanel
          selectedContent={selectedContent}
          onClose={handleEditClose}
          onSaved={handleEditSaved}
        />
      )}

      {renderContent()}
    </div>
  );
}
