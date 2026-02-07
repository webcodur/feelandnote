"use client";

import { useState, useEffect } from "react";
import { ImageOff } from "lucide-react";
import { searchCelebImages } from "@/actions/celebs";
import type { ImageSearchResult } from "@feelandnote/content-search/naver-image";

// #region 스켈레톤
function ImageSkeleton() {
  return <div className="aspect-square rounded-sm bg-stone-800/40 animate-shimmer" />;
}
// #endregion

const INITIAL_COUNT = 6;

interface ImageGalleryProps {
  nickname: string;
}

export default function ImageGallery({ nickname }: ImageGalleryProps) {
  const [items, setItems] = useState<ImageSearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [failedUrls, setFailedUrls] = useState<Set<string>>(new Set());

  useEffect(() => {
    searchCelebImages(nickname)
      .then(setItems)
      .finally(() => setLoading(false));
  }, [nickname]);

  if (loading) {
    return (
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <ImageSkeleton key={i} />
        ))}
      </div>
    );
  }

  const validItems = items.filter((item) => !failedUrls.has(item.imageUrl));

  // 결과 없음 → 섹션 숨김
  if (validItems.length === 0) return null;

  const visibleItems = expanded ? validItems : validItems.slice(0, INITIAL_COUNT);
  const hasMore = validItems.length > INITIAL_COUNT;

  return (
    <div>
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {visibleItems.map((item, i) => (
          <div
            key={`${item.imageUrl}-${i}`}
            className="relative aspect-square overflow-hidden rounded-sm bg-stone-900/60 border border-stone-800/30"
          >
            <img
              src={item.imageUrl}
              alt={item.title}
              className="size-full object-cover"
              loading="lazy"
              onError={() =>
                setFailedUrls((prev) => new Set(prev).add(item.imageUrl))
              }
            />
          </div>
        ))}
      </div>

      {hasMore && !expanded && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="w-full mt-3 py-2.5 text-xs text-text-secondary hover:text-accent"
        >
          더보기 ({validItems.length - INITIAL_COUNT}장)
        </button>
      )}
    </div>
  );
}
