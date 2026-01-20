/*
  파일명: /components/features/user/ContentItemRenderer.tsx
  기능: 콘텐츠 목록 렌더링 컴포넌트
  책임: RecordCard를 사용하여 콘텐츠 아이템을 렌더링한다.
*/ // ------------------------------
"use client";

import { CertificateCard } from "@/components/ui/cards";
import { ContentGrid } from "@/components/ui";
import RecordCard from "./RecordCard";

import type { UserContentWithContent } from "@/actions/contents/getMyContents";

// #region 타입
interface ContentItemRendererProps {
  items: UserContentWithContent[];
  compact?: boolean;
  onDelete: (userContentId: string) => void;
  // 읽기 전용 모드 (타인 기록관)
  readOnly?: boolean;
  targetUserId?: string; // viewer 모드에서 타인 ID
}
// #endregion

export default function ContentItemRenderer({
  items,
  compact = false,
  onDelete,
  readOnly = false,
  targetUserId,
}: ContentItemRendererProps) {
  // readOnly 모드에서는 삭제 콜백을 비활성화
  const deleteHandler = readOnly ? () => {} : onDelete;

  // href 생성: 사용자 ID와 콘텐츠 ID로 경로 구성
  const getHref = (item: UserContentWithContent) => {
    const userId = targetUserId || item.user_id;
    return `/${userId}/records/${item.content_id}`;
  };

  // 자격증과 일반 콘텐츠 분리
  const certificates = items.filter((item) => item.content.type === "CERTIFICATE");
  const regularContents = items.filter((item) => item.content.type !== "CERTIFICATE");

  return (
    <div className="space-y-4">
      {/* 일반 콘텐츠: 그리드 레이아웃 */}
      {regularContents.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {regularContents.map((item) => (
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
              href={getHref(item)}
              showStatusBadge={false}
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
