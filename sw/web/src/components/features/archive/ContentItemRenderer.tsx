/*
  파일명: /components/features/archive/ContentItemRenderer.tsx
  기능: 콘텐츠 목록의 뷰 모드별 렌더링 컴포넌트
  책임: 그리드/리스트 뷰 모드에 따라 콘텐츠 아이템을 렌더링한다.
*/ // ------------------------------
"use client";

import { ContentCard, CertificateCard } from "@/components/features/cards";
import { ContentGrid } from "@/components/ui";

import ContentListItem from "./ContentListItem";

import type { UserContentWithContent } from "@/actions/contents/getMyContents";
import type { ContentStatus } from "@/types/database";
import type { ViewMode } from "./hooks/useContentLibrary";

// #region 타입
interface ContentItemRendererProps {
  items: UserContentWithContent[];
  viewMode: ViewMode;
  compact?: boolean;
  onProgressChange: (userContentId: string, progress: number) => void;
  onStatusChange: (userContentId: string, status: ContentStatus) => void;
  onRecommendChange: (userContentId: string, isRecommended: boolean) => void;
  onDateChange?: (userContentId: string, field: "created_at" | "completed_at", date: string) => void;
  onDelete: (userContentId: string) => void;
}
// #endregion

// #region 상수
const LIST_HEADER_COLUMNS = {
  compact: "grid-cols-[40px_1fr_48px_56px_56px_40px_28px] text-[10px] px-3 pb-2",
  default: "grid-cols-[48px_1fr_56px_64px_64px_48px_32px] text-xs px-4 pb-2",
};
// #endregion

export default function ContentItemRenderer({
  items,
  viewMode,
  compact = false,
  onProgressChange,
  onStatusChange,
  onRecommendChange,
  onDateChange,
  onDelete,
}: ContentItemRendererProps) {
  // #region 렌더링
  if (viewMode === "grid") {
    return (
      <ContentGrid compact={compact} minWidth={compact ? 100 : 130}>
        {items.map((item) => {
          if (item.content.type === "CERTIFICATE") {
            return (
              <CertificateCard
                key={item.id}
                item={item}
                onStatusChange={onStatusChange}
                onRecommendChange={onRecommendChange}
                onDelete={onDelete}
                href={`/archive/${item.content_id}`}
              />
            );
          }
          return (
            <ContentCard
              key={item.id}
              item={item}
              onProgressChange={onProgressChange}
              onStatusChange={onStatusChange}
              onRecommendChange={onRecommendChange}
              onDateChange={onDateChange}
              onDelete={onDelete}
              href={`/archive/${item.content_id}`}
              compact={compact}
            />
          );
        })}
      </ContentGrid>
    );
  }

  const headerClass = compact ? LIST_HEADER_COLUMNS.compact : LIST_HEADER_COLUMNS.default;

  return (
    <div className={`flex flex-col ${compact ? "gap-1.5" : "gap-2"}`}>
      {/* 헤더 */}
      <div className={`grid items-center gap-3 text-text-secondary border-b border-border/30 ${headerClass}`}>
        <div />
        <div>제목</div>
        <div className="text-center border-r border-border/50 pr-3">타입</div>
        <div className="text-center">상태</div>
        <div className="text-center">등록일</div>
        <div className="text-center">진행도</div>
        <div />
      </div>
      {/* 아이템 */}
      {items.map((item) => (
        <ContentListItem
          key={item.id}
          item={item}
          onProgressChange={onProgressChange}
          onStatusChange={onStatusChange}
          onRecommendChange={onRecommendChange}
          onDelete={onDelete}
          href={`/archive/${item.content_id}`}
          compact={compact}
        />
      ))}
    </div>
  );
  // #endregion
}
