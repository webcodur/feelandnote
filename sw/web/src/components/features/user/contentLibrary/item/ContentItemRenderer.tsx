/*
  파일명: /components/features/user/ContentItemRenderer.tsx
  기능: 콘텐츠 목록 렌더링 컴포넌트
  책임: ContentCard를 사용하여 콘텐츠 아이템을 렌더링한다.
*/ // ------------------------------
"use client";

import { useState } from "react";
import { CertificateCard, ContentCard } from "@/components/ui/cards";
import { ContentGrid } from "@/components/ui";
import { getCategoryByDbType } from "@/constants/categories";
import { updateUserContentRating } from "@/actions/contents/updateRating";
import RatingEditModal from "@/components/ui/cards/ContentCard/modals/RatingEditModal";
import type { UserContentWithContent } from "@/actions/contents/getMyContents";
import type { ViewMode } from "../contentLibraryTypes";

// #region 타입
interface ContentItemRendererProps {
  items: UserContentWithContent[];
  compact?: boolean;
  viewMode?: ViewMode;
  onDelete: (userContentId: string) => void;
  onAddContent?: (contentId: string) => void;
  // 읽기 전용 모드 (타인 기록관)
  readOnly?: boolean;
  targetUserId?: string;
  ownerNickname?: string;
  // 뷰어 모드: 보유 콘텐츠 ID 집합 (null = 비로그인)
  savedContentIds?: Set<string> | null;
}
// #endregion

export default function ContentItemRenderer({
  items,
  compact = false,
  viewMode = "grid",
  onDelete,
  onAddContent,
  readOnly = false,
  targetUserId,
  ownerNickname,
  savedContentIds,
}: ContentItemRendererProps) {
  // 별점 편집 모달 상태
  const [ratingEditTarget, setRatingEditTarget] = useState<{
    userContentId: string;
    contentTitle: string;
    rating: number | null;
  } | null>(null);
  // 별점 로컬 상태 (서버 반영 후 즉시 UI 업데이트용)
  const [localRatings, setLocalRatings] = useState<Record<string, number | null>>({});

  // readOnly 모드에서는 삭제 콜백을 비활성화
  const deleteHandler = readOnly ? () => {} : onDelete;

  // href 생성: 콘텐츠 상세 페이지로 이동
  const getHref = (item: UserContentWithContent) => {
    const category = getCategoryByDbType(item.content.type)?.id || "book";
    return `/content/${item.content_id}?category=${category}`;
  };

  // 자격증과 일반 콘텐츠 분리
  const certificates = items.filter((item) => item.content.type === "CERTIFICATE");
  const regularContents = items.filter((item) => item.content.type !== "CERTIFICATE");

  // 뷰어 보유 여부
  const isViewerSaved = (contentId: string) =>
    savedContentIds !== null && savedContentIds !== undefined && savedContentIds.has(contentId);
  const isViewerLoggedIn = savedContentIds !== null && savedContentIds !== undefined;

  return (
    <div className="space-y-4">
      {/* 일반 콘텐츠 */}
      {regularContents.length > 0 && (
        <div className={viewMode === "list"
          ? "grid grid-cols-2 md:grid-cols-2 gap-2 md:gap-4"
          : "grid grid-cols-2 md:grid-cols-5 gap-2 md:gap-4"
        }>
          {regularContents.map((item) => {
            const currentRating = localRatings[item.id] !== undefined ? localRatings[item.id] : item.rating;
            // list 모드: review prop 전달 → ContentCard 리뷰 모드 활성화
            const reviewProp = viewMode === "list" ? item.review : undefined;
            return (
              <ContentCard
                key={item.id}
                contentId={item.content_id}
                contentType={item.content.type}
                title={item.content.title}
                creator={item.content.creator}
                thumbnail={item.content.thumbnail_url}
                status={item.status}
                rating={currentRating}
                review={reviewProp}
                isSpoiler={item.is_spoiler ?? undefined}
                sourceUrl={item.source_url}
                href={getHref(item)}
                showStatusBadge={false}
                ownerNickname={ownerNickname}
                userContentId={item.id}
                recommendable={!readOnly && item.status === "FINISHED"}
                onRatingClick={!readOnly ? (e) => {
                  e.stopPropagation();
                  setRatingEditTarget({
                    userContentId: item.id,
                    contentTitle: item.content.title,
                    rating: currentRating,
                  });
                } : undefined}
                saved={readOnly && isViewerSaved(item.content_id)}
                addable={readOnly && isViewerLoggedIn && !isViewerSaved(item.content_id)}
                onAdd={() => onAddContent?.(item.content_id)}
              />
            );
          })}
        </div>
      )}

      {/* 자격증: 그리드 레이아웃 유지 */}
      {certificates.length > 0 && (
        <ContentGrid compact={compact} minWidth={compact ? 300 : 330}>
          {certificates.map((item) => (
            <CertificateCard
              key={item.id}
              item={item}
              onStatusChange={() => {}}
              onRecommendChange={() => {}}
              onDelete={deleteHandler}
              href={getHref(item)}
              isBatchMode={false}
              isSelected={false}
              readOnly={readOnly}
            />
          ))}
        </ContentGrid>
      )}

      {/* 별점 편집 모달 */}
      {ratingEditTarget && (
        <RatingEditModal
          isOpen={true}
          onClose={() => setRatingEditTarget(null)}
          contentTitle={ratingEditTarget.contentTitle}
          currentRating={ratingEditTarget.rating}
          onSave={async (rating) => {
            const result = await updateUserContentRating({
              userContentId: ratingEditTarget.userContentId,
              rating,
            });
            if (result.success) {
              setLocalRatings((prev) => ({
                ...prev,
                [ratingEditTarget.userContentId]: rating,
              }));
            }
          }}
        />
      )}
    </div>
  );
}
