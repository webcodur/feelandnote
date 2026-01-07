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
import type { ContentStatus, CategoryWithCount } from "@/types/database";
import type { ViewMode } from "./hooks/useContentLibrary";

// #region 타입
interface ContentItemRendererProps {
  items: UserContentWithContent[];
  viewMode: ViewMode;
  compact?: boolean;
  categories?: CategoryWithCount[];
  onProgressChange: (userContentId: string, progress: number) => void;
  onStatusChange: (userContentId: string, status: ContentStatus) => void;
  onRecommendChange: (userContentId: string, isRecommended: boolean) => void;
  onDateChange?: (userContentId: string, field: "created_at" | "completed_at", date: string) => void;
  onCategoryChange?: (userContentId: string, categoryId: string | null) => void;
  onDelete: (userContentId: string) => void;
  // 배치 모드
  isBatchMode?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
  // 핀 모드
  isPinMode?: boolean;
  onPinToggle?: (userContentId: string) => void;
}
// #endregion

// #region 상수
const LIST_HEADER_COLUMNS = {
  compact: "grid-cols-[24px_minmax(100px,1fr)_minmax(60px,100px)_52px_40px_48px_48px_40px_36px_minmax(60px,140px)_24px] text-[10px] px-2 pb-1.5",
  default: "grid-cols-[28px_minmax(120px,1fr)_minmax(80px,120px)_56px_44px_52px_52px_44px_40px_minmax(80px,180px)_28px] text-[11px] px-3 pb-1.5",
};
// #endregion

export default function ContentItemRenderer({
  items,
  viewMode,
  compact = false,
  categories = [],
  onProgressChange,
  onStatusChange,
  onRecommendChange,
  onDateChange,
  onCategoryChange,
  onDelete,
  isBatchMode = false,
  selectedIds = new Set(),
  onToggleSelect,
  isPinMode = false,
  onPinToggle,
}: ContentItemRendererProps) {
  // #region 렌더링

  // 그리드 모드
  if (viewMode === "grid") {
    return (
      <ContentGrid compact={compact} minWidth={compact ? 300 : 330}>
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
                isBatchMode={isBatchMode}
                isSelected={selectedIds.has(item.id)}
                onToggleSelect={onToggleSelect ? () => onToggleSelect(item.id) : undefined}
              />
            );
          }
          return (
            <ContentCard
              key={item.id}
              item={item}
              categories={categories}
              onProgressChange={onProgressChange}
              onStatusChange={onStatusChange}
              onRecommendChange={onRecommendChange}
              onDateChange={onDateChange}
              onCategoryChange={onCategoryChange}
              onDelete={onDelete}
              href={`/archive/${item.content_id}`}
              compact={compact}
              isBatchMode={isBatchMode}
              isSelected={selectedIds.has(item.id)}
              onToggleSelect={onToggleSelect ? () => onToggleSelect(item.id) : undefined}
              isPinMode={isPinMode}
              onPinToggle={onPinToggle}
            />
          );
        })}
      </ContentGrid>
    );
  }

  // 리스트 모드
  const headerClass = compact ? LIST_HEADER_COLUMNS.compact : LIST_HEADER_COLUMNS.default;

  return (
    <div className="overflow-x-auto">
      <div className={`flex flex-col ${compact ? "gap-0.5" : "gap-1"} min-w-[800px]`}>
        {/* 헤더 */}
        <div className={`grid items-center gap-2 text-text-tertiary border-b border-border/30 ${headerClass}`}>
          <div />
          <div className="text-center">제목</div>
          <div className="text-center">작가</div>
          <div className="text-center">분류</div>
          <div className="text-center">상태</div>
          <div className="text-center">시작일</div>
          <div className="text-center">종료일</div>
          <div className="text-center">별점</div>
          <div className="text-center">진행도</div>
          <div className="text-center">리뷰</div>
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
            isBatchMode={isBatchMode}
            isSelected={selectedIds.has(item.id)}
            onToggleSelect={onToggleSelect ? () => onToggleSelect(item.id) : undefined}
          />
        ))}
      </div>
    </div>
  );
  // #endregion
}
