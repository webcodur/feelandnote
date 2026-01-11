"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Inbox } from "lucide-react";
import CelebReviewCard from "./CelebReviewCard";
import { getCelebFeed } from "@/actions/home";
import type { CelebReview } from "@/types/home";

// #region Skeleton
function ReviewCardSkeleton() {
  return (
    <div className="bg-bg-card border border-border rounded-xl p-4 animate-pulse">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-10 h-10 rounded-full bg-white/10" />
        <div className="flex-1">
          <div className="w-24 h-4 bg-white/10 rounded" />
        </div>
        <div className="w-16 h-8 bg-white/10 rounded-lg" />
      </div>
      <div className="flex gap-3 bg-bg-secondary rounded-lg p-3 mb-3">
        <div className="w-14 h-20 bg-white/10 rounded" />
        <div className="flex-1 space-y-2">
          <div className="w-32 h-4 bg-white/10 rounded" />
          <div className="w-20 h-3 bg-white/10 rounded" />
          <div className="w-24 h-4 bg-white/10 rounded" />
        </div>
      </div>
      <div className="space-y-2 mb-3">
        <div className="w-full h-4 bg-white/10 rounded" />
        <div className="w-3/4 h-4 bg-white/10 rounded" />
      </div>
    </div>
  );
}
// #endregion

// #region Empty State
function EmptyFeed() {
  return (
    <div className="text-center py-16">
      <Inbox size={48} className="mx-auto mb-4 text-text-tertiary opacity-50" />
      <h3 className="text-lg font-semibold mb-2">아직 리뷰가 없어요</h3>
      <p className="text-sm text-text-secondary">
        셀럽들의 리뷰가 곧 업데이트됩니다.
      </p>
    </div>
  );
}
// #endregion

interface CelebFeedProps {
  initialReviews?: CelebReview[];
}

export default function CelebFeed({ initialReviews = [] }: CelebFeedProps) {
  const searchParams = useSearchParams();
  const contentType = searchParams.get("type") ?? "all";

  const [reviews, setReviews] = useState<CelebReview[]>(initialReviews);
  const [isLoading, setIsLoading] = useState(initialReviews.length === 0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const observerRef = useRef<HTMLDivElement>(null);

  // 초기 데이터 또는 타입 변경 시 로드
  const loadInitial = useCallback(async () => {
    setIsLoading(true);
    const result = await getCelebFeed({ contentType, limit: 20 });
    setReviews(result.reviews);
    setCursor(result.nextCursor);
    setHasMore(result.hasMore);
    setIsLoading(false);
  }, [contentType]);

  // 추가 데이터 로드
  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore || !cursor) return;

    setIsLoadingMore(true);
    const result = await getCelebFeed({ contentType, cursor, limit: 20 });
    setReviews((prev) => [...prev, ...result.reviews]);
    setCursor(result.nextCursor);
    setHasMore(result.hasMore);
    setIsLoadingMore(false);
  }, [contentType, cursor, hasMore, isLoadingMore]);

  // 콘텐츠 타입 변경 시 리셋
  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  // Intersection Observer 설정
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading && !isLoadingMore) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    const currentRef = observerRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [loadMore, hasMore, isLoading, isLoadingMore]);

  if (isLoading) {
    return (
      <section className="px-4">
        <div className="space-y-4">
          <ReviewCardSkeleton />
          <ReviewCardSkeleton />
          <ReviewCardSkeleton />
        </div>
      </section>
    );
  }

  if (reviews.length === 0) {
    return <EmptyFeed />;
  }

  return (
    <section className="px-4">
      <div className="space-y-4">
        {reviews.map((review) => (
          <CelebReviewCard key={review.id} review={review} />
        ))}

        {/* 로딩 스켈레톤 */}
        {isLoadingMore && (
          <>
            <ReviewCardSkeleton />
            <ReviewCardSkeleton />
          </>
        )}

        {/* 무한 스크롤 트리거 */}
        <div ref={observerRef} className="h-4" />

        {/* 더 이상 로드할 데이터 없음 */}
        {!hasMore && reviews.length > 0 && (
          <p className="text-center text-sm text-text-tertiary py-4">
            모든 리뷰를 불러왔습니다
          </p>
        )}
      </div>
    </section>
  );
}
