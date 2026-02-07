"use client";

import { useState, useEffect } from "react";
import { Newspaper } from "lucide-react";
import { searchCelebNews } from "@/actions/celebs";
import type { NewsSearchResult } from "@feelandnote/content-search/naver-news";
import NewsItem from "./news/NewsItem";

// #region 쉬머 스켈레톤
function NewsItemSkeleton() {
  return (
    <div className="rounded-sm border border-stone-800/30 bg-black/40 p-3 sm:p-4 animate-shimmer">
      <div className="h-4 w-3/4 bg-stone-800/50 rounded" />
      <div className="mt-2 h-3 w-full bg-stone-800/40 rounded" />
      <div className="mt-1 h-3 w-2/3 bg-stone-800/40 rounded" />
      <div className="mt-2.5 h-3 w-1/4 bg-stone-800/30 rounded" />
    </div>
  );
}
// #endregion

const INITIAL_COUNT = 5;

interface NewsFeedProps {
  nickname: string;
}

export default function NewsFeed({ nickname }: NewsFeedProps) {
  const [items, setItems] = useState<NewsSearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    searchCelebNews(nickname)
      .then(setItems)
      .finally(() => setLoading(false));
  }, [nickname]);

  // 로딩
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <NewsItemSkeleton key={i} />
        ))}
      </div>
    );
  }

  // 결과 없음 → 섹션 자체를 숨김
  if (items.length === 0) return null;

  const visibleItems = expanded ? items : items.slice(0, INITIAL_COUNT);
  const hasMore = items.length > INITIAL_COUNT;

  return (
    <div className="space-y-3">
      {visibleItems.map((item, i) => (
        <NewsItem key={`${item.originalLink}-${i}`} item={item} />
      ))}

      {hasMore && !expanded && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="w-full py-2.5 text-xs text-text-secondary hover:text-accent"
        >
          더보기 ({items.length - INITIAL_COUNT}건)
        </button>
      )}
    </div>
  );
}
