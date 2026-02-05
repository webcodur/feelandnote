/*
  파일명: /components/features/user/ContentItemRenderer.tsx
  기능: 콘텐츠 목록 렌더링 컴포넌트
  책임: ContentCard를 사용하여 콘텐츠 아이템을 렌더링한다.
*/ // ------------------------------
"use client";

import { CertificateCard, ContentCard } from "@/components/ui/cards";
import { ContentGrid } from "@/components/ui";
import { getCategoryByDbType } from "@/constants/categories";
import type { UserContentWithContent } from "@/actions/contents/getMyContents";

// #region 타입
interface ContentItemRendererProps {
  items: UserContentWithContent[];
  compact?: boolean;
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
  onDelete,
  onAddContent,
  readOnly = false,
  targetUserId,
  ownerNickname,
  savedContentIds,
}: ContentItemRendererProps) {
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
      {/* 일반 콘텐츠: 그리드 레이아웃 */}
      {regularContents.length > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:gap-4">
          {regularContents.map((item) => (
              <ContentCard
                key={item.id}
                contentId={item.content_id}
                contentType={item.content.type}
                title={item.content.title}
                creator={item.content.creator}
                thumbnail={item.content.thumbnail_url}
                status={item.status}
                rating={item.rating}
                review={item.review}
                isSpoiler={item.is_spoiler ?? undefined}
                sourceUrl={item.source_url}
                href={getHref(item)}
                showStatusBadge={false}
                ownerNickname={ownerNickname}
                userCount={item.content.user_count ?? 0}
                // 본인 + FINISHED → 선물(추천) 모달
                userContentId={item.id}
                recommendable={!readOnly && item.status === "FINISHED"}
                // 타인(로그인) + 보유 → 북마크(채움)
                saved={readOnly && isViewerSaved(item.content_id)}
                // 타인(로그인) + 미보유 → 북마크(빈)
                addable={readOnly && isViewerLoggedIn && !isViewerSaved(item.content_id)}
                onAdd={() => onAddContent?.(item.content_id)}
              />
          ))}
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
    </div>
  );
}
