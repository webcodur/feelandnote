"use client";

import { useState, useMemo, useCallback } from "react";
import ContentCard from "@/components/ui/cards/ContentCard";
import { getCategoryByDbType } from "@/constants/categories";
import { addContent } from "@/actions/contents/addContent";
import type { UserContentPublic } from "@/actions/contents/getUserContents";

interface RecentRecordsProps {
  items: UserContentPublic[];
  userId: string;
  isOwner: boolean;
  savedContentIds?: string[]; // 타인 프로필: 뷰어의 보유 콘텐츠 ID 목록 (undefined = 비로그인)
}

export default function RecentRecords({ items, userId, isOwner, savedContentIds }: RecentRecordsProps) {
  const savedSet = useMemo(() => new Set(savedContentIds), [savedContentIds]);

  // 뷰어가 추가한 콘텐츠 추적 (addable → saved 전환)
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

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

  if (items.length === 0) {
    return (
      <div className="p-12 text-center border border-dashed border-accent-dim/30 rounded-sm">
        <p className="text-text-secondary font-serif italic">The archives are currently empty.</p>
      </div>
    );
  }

  // 뷰어가 보유한 콘텐츠인지 판단 (기존 savedSet + 방금 추가한 addedIds)
  const isViewerSaved = (contentId: string) =>
    savedSet.has(contentId) || addedIds.has(contentId);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
      {items.map((item) => (
        <ContentCard
          key={item.id}
          contentId={item.content_id}
          contentType={item.content.type}
          title={item.content.title}
          creator={item.content.creator}
          thumbnail={item.content.thumbnail_url}
          rating={item.public_record?.rating ?? undefined}
          href={`/content/${item.content_id}?category=${getCategoryByDbType(item.content.type)?.id || "book"}`}
          userCount={item.content.user_count ?? 0}
          // 본인 → 선물(추천) 모달
          userContentId={item.id}
          recommendable={isOwner}
          // 타인(로그인) + 보유 → 북마크(채움)
          saved={!isOwner && savedContentIds !== undefined && isViewerSaved(item.content_id)}
          // 타인(로그인) + 미보유 → 북마크(빈)
          addable={!isOwner && savedContentIds !== undefined && !isViewerSaved(item.content_id)}
          onAdd={() => handleAdd(item)}
        />
      ))}
    </div>
  );
}
