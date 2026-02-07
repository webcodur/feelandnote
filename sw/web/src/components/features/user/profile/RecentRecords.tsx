"use client";

import { useState, useMemo, useCallback } from "react";
import ContentCard from "@/components/ui/cards/ContentCard";
import { Pagination } from "@/components/ui";
import { getCategoryByDbType } from "@/constants/categories";
import { addContent } from "@/actions/contents/addContent";
import { getUserContents, type UserContentPublic } from "@/actions/contents/getUserContents";
import { checkContentsSaved } from "@/actions/contents/getMyContentIds";

const PAGE_LIMIT = 10;

interface RecentRecordsProps {
  items: UserContentPublic[];
  initialTotalPages: number;
  userId: string;
  isOwner: boolean;
  savedContentIds?: string[]; // 타인 프로필: 뷰어의 보유 콘텐츠 ID 목록 (undefined = 비로그인)
}

export default function RecentRecords({ items, initialTotalPages, userId, isOwner, savedContentIds }: RecentRecordsProps) {
  const [currentItems, setCurrentItems] = useState(items);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(initialTotalPages);
  const [isLoading, setIsLoading] = useState(false);

  const initialSavedSet = useMemo(() => new Set(savedContentIds), [savedContentIds]);

  // 뷰어가 추가한 콘텐츠 추적 (addable → saved 전환)
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  // 페이지 변경 시 서버에서 새로 받아온 savedIds
  const [pageSavedSet, setPageSavedSet] = useState<Set<string>>(initialSavedSet);

  const handlePageChange = useCallback(async (page: number) => {
    setIsLoading(true);
    try {
      const result = await getUserContents({ userId, limit: PAGE_LIMIT, status: "FINISHED", page });
      setCurrentItems(result.items);
      setTotalPages(result.totalPages);
      setCurrentPage(page);

      // 타인 프로필 + 로그인 시 보유 여부 재체크
      if (!isOwner && savedContentIds !== undefined && result.items.length > 0) {
        const savedSet = await checkContentsSaved(result.items.map(c => c.content_id));
        if (savedSet) setPageSavedSet(savedSet);
      }
    } catch (err) {
      console.error("페이지 로드 실패:", err);
    } finally {
      setIsLoading(false);
    }
  }, [userId, isOwner, savedContentIds]);

  // 콘텐츠 추가 핸들러 (뷰어 모드)
  const handleAdd = useCallback(async (item: UserContentPublic) => {
    const result = await addContent({
      id: item.content_id,
      type: item.content.type,
      title: item.content.title,
      creator: item.content.creator ?? undefined,
      thumbnailUrl: item.content.thumbnail_url ?? undefined,
      status: "WANT",
    });
    if (result.success) {
      setAddedIds(prev => new Set(prev).add(item.content_id));
    }
  }, []);

  if (currentItems.length === 0 && !isLoading) {
    return (
      <div className="p-12 text-center border border-dashed border-accent-dim/30 rounded-sm">
        <p className="text-text-secondary font-serif">The archives are currently empty.</p>
      </div>
    );
  }

  // 뷰어가 보유한 콘텐츠인지 판단
  const isViewerSaved = (contentId: string) =>
    pageSavedSet.has(contentId) || addedIds.has(contentId);

  return (
    <div className="space-y-6">
      <div className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 ${isLoading ? "opacity-50 pointer-events-none" : ""}`}>
        {currentItems.map((item) => (
          <ContentCard
            key={item.id}
            contentId={item.content_id}
            contentType={item.content.type}
            title={item.content.title}
            creator={item.content.creator}
            thumbnail={item.content.thumbnail_url}
            rating={item.public_record?.rating ?? undefined}
            href={`/content/${item.content_id}?category=${getCategoryByDbType(item.content.type)?.id || "book"}`}
            userContentId={item.id}
            recommendable={isOwner}
            saved={!isOwner && savedContentIds !== undefined && isViewerSaved(item.content_id)}
            addable={!isOwner && savedContentIds !== undefined && !isViewerSaved(item.content_id)}
            onAdd={() => handleAdd(item)}
          />
        ))}
      </div>
      <hr className="border-white/10" />
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
      />
    </div>
  );
}
