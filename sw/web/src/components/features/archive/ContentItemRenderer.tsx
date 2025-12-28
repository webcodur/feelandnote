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
