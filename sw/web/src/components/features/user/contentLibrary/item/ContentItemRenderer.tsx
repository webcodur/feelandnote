/*
  파일명: /components/features/user/ContentItemRenderer.tsx
  기능: 콘텐츠 목록 렌더링 컴포넌트
  책임: RecordCard를 사용하여 콘텐츠 아이템을 렌더링한다.
*/ // ------------------------------
"use client";

import { CertificateCard } from "@/components/ui/cards";
import { ContentGrid } from "@/components/ui";
import RecordCard from "@/components/ui/cards/RecordCard";
import { RecommendButton } from "@/components/features/recommendations";
import { getCategoryByDbType } from "@/constants/categories";
import type { UserContentWithContent } from "@/actions/contents/getMyContents";

// #region 타입
interface ContentItemRendererProps {
  items: UserContentWithContent[];
  compact?: boolean;
  onDelete: (userContentId: string) => void;
  // 읽기 전용 모드 (타인 기록관)
  readOnly?: boolean;
  targetUserId?: string; // viewer 모드에서 타인 ID
  ownerNickname?: string; // 기록 소유자 닉네임
}
// #endregion

export default function ContentItemRenderer({
  items,
  compact = false,
  onDelete,
  readOnly = false,
  targetUserId,
  ownerNickname,
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

  return (
    <div className="space-y-4">
      {/* 일반 콘텐츠: 그리드 레이아웃 */}
      {regularContents.length > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:gap-4">
          {regularContents.map((item) => {
            // 본인 소유 + FINISHED 상태일 때만 추천 버튼 표시
            const showRecommend = !readOnly && item.status === "FINISHED";

            return (
              <RecordCard
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
                actionNode={showRecommend ? (
                  <RecommendButton
                    userContentId={item.id}
                    contentTitle={item.content.title}
                    contentThumbnail={item.content.thumbnail_url}
                    contentType={item.content.type}
                    iconOnly
                  />
                ) : undefined}
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
    </div>
  );
}
