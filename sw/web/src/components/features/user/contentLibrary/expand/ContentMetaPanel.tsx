/* 펼침 보기에서 작품의 타입별 부가 정보를 조합한다. */
"use client";

import type { ContentBrief } from "@/actions/contents/getContentBrief";
import ContentMetadataDisplay from "@/components/shared/content/ContentMetadataDisplay";

import { GameScreenshots, MusicDetails, VideoDetails } from "./ContentMetaDetails";

interface ContentMetaPanelProps {
  brief: ContentBrief | null;
  isLoading: boolean;
  internalHref: string;
  mediaEnabled?: boolean;
}

function LoadingMetadata() {
  return (
    <div className="space-y-2 border-t border-white/10 px-3 py-4 sm:px-4 md:px-5">
      <div className="h-3 w-32 animate-pulse rounded bg-white/[0.06]" />
      <div className="h-3 w-48 animate-pulse rounded bg-white/[0.06]" />
    </div>
  );
}

export default function ContentMetaPanel({
  brief,
  isLoading,
  internalHref,
  mediaEnabled = true,
}: ContentMetaPanelProps) {
  if (isLoading) return <LoadingMetadata />;
  if (!brief) return null;

  const { metadata, category, subtype } = brief;
  const hasMetadata = metadata != null && Object.keys(metadata).length > 0;

  // 책은 값이 비어 있어도 미확인 상태와 내부 감상 링크를 보여준다.
  if (!hasMetadata && category !== "book") return null;

  return (
    <div className="space-y-4 border-t border-white/10 px-3 py-4 sm:px-4 md:px-5 md:py-5">
      {category !== "music" && (
        <ContentMetadataDisplay
          category={category}
          metadata={metadata ?? {}}
          subtype={subtype ?? metadata?.subtype}
          bookGrid
          internalHref={internalHref}
        />
      )}

      {category === "video" && metadata && <VideoDetails metadata={metadata} />}
      {category === "music" && metadata && (
        <MusicDetails metadata={metadata} mediaEnabled={mediaEnabled} />
      )}
      {category === "game" && metadata && (
        <GameScreenshots
          screenshots={metadata.screenshots ?? []}
          mediaEnabled={mediaEnabled}
        />
      )}
    </div>
  );
}
