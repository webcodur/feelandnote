"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { getMyContents, type UserContentWithContent } from "@/actions/contents/getMyContents";
import { getWantContentCounts } from "@/actions/contents/getContentCounts";
import { CATEGORY_ID_TO_TYPE, type CategoryId } from "@/constants/categories";
import type { ContentTypeCounts } from "@/types/content";
import InterestCard from "@/components/features/user/contentLibrary/item/InterestCard";
import InterestsControlBar, { type InterestSortOption } from "./InterestsControlBar";
import InterestsEditPanel from "./InterestsEditPanel";
import { ChevronLeft, ChevronRight, Inbox } from "lucide-react";
import Button from "@/components/ui/Button";
import { CertificateCard } from "@/components/ui/cards";
import ClassicalBox from "@/components/ui/ClassicalBox";
import { DecorativeLabel, InnerBox } from "@/components/ui";

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

  // 선택된 콘텐츠 상태
  const [selectedContentId, setSelectedContentId] = useState<string | null>(null);

  // 데이터 로딩
  const loadContents = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getMyContents({
        type: CATEGORY_ID_TO_TYPE[activeTab],
        status: "WANT",
        page: currentPage,
        limit: 20,
      });
      setContents(result.items);
      setTotalPages(result.totalPages);
      setTotal(result.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "콘텐츠를 불러오는데 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, currentPage]);

  const loadTypeCounts = useCallback(async () => {
    try {
      const counts = await getWantContentCounts();
      setTypeCounts(counts);
    } catch (err) {
      console.error("타입별 개수 로드 실패:", err);
    }
  }, []);

  useEffect(() => {
    loadContents();
    loadTypeCounts();
  }, [loadContents, loadTypeCounts]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);

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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {regularContents.map((item) => (
                <InterestCard
                  key={item.id}
                  contentType={item.content.type}
                  title={item.content.title}
                  creator={item.content.creator}
                  thumbnail={item.content.thumbnail_url}
                  href={`/${userId}/records/${item.content_id}`}
                  isSelected={isOwner && selectedContentId === item.id}
                  onSelect={isOwner ? () => handleSelect(item.id) : undefined}
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
                  href={`/${userId}/records/${item.content_id}`}
                  isBatchMode={false}
                  isSelected={false}
                  readOnly={!isOwner}
                />
              ))}
            </div>
          )}
        </div>
      </ClassicalBox>
    );
  };

  return (
    <div className="w-full">
      {/* 편집 영역 (소유자만 표시) */}
      {isOwner && (
        <div className="mt-4">
          <InterestsEditPanel
            selectedContent={selectedContent}
            onClose={handleEditClose}
            onSaved={handleEditSaved}
          />
        </div>
      )}

      <div className={isOwner ? "" : "mt-4"}>
        {renderContent()}
      </div>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft size={16} />
          </Button>
          <span className="text-sm text-text-secondary">
            {currentPage} / {totalPages}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            <ChevronRight size={16} />
          </Button>
        </div>
      )}
    </div>
  );
}
