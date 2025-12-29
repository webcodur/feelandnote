"use client";

import { ContentCard, CertificateCard } from "@/components/features/cards";
import ContentListItem from "./ContentListItem";
import { ContentGrid } from "@/components/ui";
import type { UserContentWithContent } from "@/actions/contents/getMyContents";
import type { ContentStatus } from "@/types/database";
import type { ViewMode } from "./hooks/useContentLibrary";

interface ContentItemRendererProps {
  items: UserContentWithContent[];
  viewMode: ViewMode;
  compact?: boolean;
  onProgressChange: (userContentId: string, progress: number) => void;
  onStatusChange: (userContentId: string, status: ContentStatus) => void;
  onDelete: (userContentId: string) => void;
}

export default function ContentItemRenderer({
  items,
  viewMode,
  compact = false,
  onProgressChange,
  onStatusChange,
  onDelete,
}: ContentItemRendererProps) {
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
              onDelete={onDelete}
              href={`/archive/${item.content_id}`}
              compact={compact}
            />
          );
        })}
      </ContentGrid>
    );
  }

  return (
    <div className={`flex flex-col ${compact ? "gap-1.5" : "gap-2"}`}>
      {/* 헤더 */}
      <div
        className={`grid items-center gap-3 text-text-secondary border-b border-border/30 ${
          compact
            ? "grid-cols-[40px_1fr_48px_64px_56px_100px_28px] text-[10px] px-3 pb-2"
            : "grid-cols-[48px_1fr_48px_72px_64px_140px_32px] text-xs px-4 pb-2"
        }`}
      >
        <div />
        <div>제목</div>
        <div className="text-center">타입</div>
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
          onDelete={onDelete}
          href={`/archive/${item.content_id}`}
          compact={compact}
        />
      ))}
    </div>
  );
}
