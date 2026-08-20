/*
  파일명: /components/features/user/ContentItemRenderer.tsx
  기능: 콘텐츠 목록 렌더링 컴포넌트
  책임: ContentCard를 사용하여 콘텐츠 아이템을 렌더링한다.
*/ // ------------------------------
"use client";

import { useState } from "react";
import { ContentCard } from "@/components/ui/cards";
import ContentGrid from "@/components/ui/ContentGrid";
import { getCategoryByDbType } from "@/constants/categories";
import { updateUserContentRating } from "@/actions/contents/updateRating";
import RatingEditModal from "@/components/ui/cards/ContentCard/modals/RatingEditModal";
import type { UserContentWithContent } from "@/actions/contents/getMyContents";
import type { ViewMode } from "../contentLibraryTypes";
import { getLocalizedContent } from "@/lib/utils/editions";
import { useLocale } from "next-intl";
import ExpandDetailView from "../expand/ExpandDetailView";
import type { ContentBrief } from "@/actions/contents/getContentBrief";

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
  ownerAvatarUrl?: string | null;
  // 뷰어 모드: 보유 콘텐츠 ID 집합 (null = 비로그인)
  savedContentIds?: Set<string> | null;
  effectsEnabled?: boolean;
  desktopPresentation?: boolean;
  initialContentBrief?: ContentBrief | null;
}
// #endregion

export default function ContentItemRenderer({
  items,
  viewMode = "list",
  onDelete,
  onAddContent,
  readOnly = false,
  ownerNickname,
  ownerAvatarUrl,
  savedContentIds,
  effectsEnabled = true,
  desktopPresentation = false,
  initialContentBrief,
}: ContentItemRendererProps) {
  // 별점 편집 모달 상태
  const [ratingEditTarget, setRatingEditTarget] = useState<{
    userContentId: string;
    contentTitle: string;
    rating: number | null;
  } | null>(null);
  // 별점 로컬 상태 (서버 반영 후 즉시 UI 업데이트용)
  const [localRatings, setLocalRatings] = useState<Record<string, number | null>>({});

  const locale = useLocale();
  // readOnly 모드에서는 삭제 콜백을 비활성화
  const deleteHandler = readOnly ? () => {} : onDelete;

  // href 생성: 콘텐츠 상세 페이지로 이동
  const getHref = (item: UserContentWithContent) => {
    const category = getCategoryByDbType(item.content.type)?.id || "book";
    return `/content/${item.content_id}?category=${category}`;
  };

  // 펼침 보기는 카드 격자를 쓰지 않는다 — 목록에서 고른 한 건을 통째로 보여준다
  if (viewMode === "expand") {
    return (
      <ExpandDetailView
        items={items}
        ownerNickname={ownerNickname}
        ownerAvatarUrl={ownerAvatarUrl}
        isActive={effectsEnabled}
        desktopPresentation={desktopPresentation}
        initialContentBrief={initialContentBrief}
      />
    );
  }

  // 뷰어 보유 여부
  const isViewerSaved = (contentId: string) =>
    savedContentIds !== null && savedContentIds !== undefined && savedContentIds.has(contentId);
  const isViewerLoggedIn = savedContentIds !== null && savedContentIds !== undefined;

  return (
    <div className="space-y-4">
      <ContentGrid variant="list">
        {items.map((item) => {
          const currentRating = localRatings[item.id] !== undefined ? localRatings[item.id] : item.rating;
          const rawReview = (locale === 'en' && item.review_en) ? item.review_en : item.review;
          const reviewIsOriginalLanguage = locale === "en" && !item.review_en && !!item.review;
          return (
            <div key={item.id} className="w-full">
            <ContentCard
              contentId={item.content_id}
              contentType={item.content.type}
              title={getLocalizedContent(item.content, locale).title}
              creator={getLocalizedContent(item.content, locale).creator}
              thumbnail={item.content.thumbnail_url}
              rating={currentRating}
              review={rawReview}
              reviewIsOriginalLanguage={reviewIsOriginalLanguage}
              heightClass="h-[320px]"
              isSpoiler={item.is_spoiler ?? undefined}
              sourceUrl={item.source_url}
              href={getHref(item)}
              showStatusBadge={false}
              ownerNickname={ownerNickname}
              userContentId={item.id}
              recommendable={!readOnly}
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
              deletable={!readOnly}
              onDelete={!readOnly ? (e) => {
                // 이벤트 전파 방지 (카드 클릭 방지)
                e?.stopPropagation();
                deleteHandler(item.id);
              } : undefined}
              titleKo={item.content.title_ko}
              titleEn={item.content.title_en}
              creatorEn={item.content.creator_en}
              thumbnailEn={item.content.thumbnail_en}
              hasEnEdition={item.content.has_en_edition}
              effectsEnabled={effectsEnabled}
            />
            </div>
          );
        })}
      </ContentGrid>

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
