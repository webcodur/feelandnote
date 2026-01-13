"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Inbox, TrendingUp, Book, Film, Gamepad2, Music, Award, LayoutGrid } from "lucide-react";
import CelebReviewCard from "./CelebReviewCard";
import { LoadMoreButton, Button } from "@/components/ui";
import { getCelebFeed } from "@/actions/home";
import type { CelebReview } from "@/types/home";
import type { ContentTypeCounts } from "@/actions/home";

// #region 콘텐츠 타입 필터
const CONTENT_TYPES = [
  { value: "all", label: "전체", icon: LayoutGrid },
  { value: "BOOK", label: "도서", icon: Book },
  { value: "VIDEO", label: "영상", icon: Film },
  { value: "GAME", label: "게임", icon: Gamepad2 },
  { value: "MUSIC", label: "음악", icon: Music },
  { value: "CERTIFICATE", label: "자격증", icon: Award },
] as const;
// #endregion

// #region Skeleton
function ReviewCardSkeleton() {
  return (
    <div className="bg-bg-card border border-border/50 rounded-xl overflow-hidden flex flex-col md:flex-row animate-pulse">
      {/* 좌측: 이미지 + 오버레이 */}
      <div className="w-full md:w-[160px] lg:w-[180px] aspect-[4/5] md:aspect-auto md:h-[200px] bg-white/5 shrink-0" />

      {/* 우측: 셀럽 + 리뷰 */}
      <div className="flex-1 p-4 flex flex-col">
        {/* 셀럽 헤더 */}
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-full bg-white/10" />
          <div className="space-y-1">
            <div className="w-28 h-3.5 bg-white/10 rounded" />
            <div className="w-16 h-2.5 bg-white/5 rounded" />
          </div>
        </div>

        {/* 리뷰 */}
        <div className="flex-1 space-y-1.5">
          <div className="w-full h-3.5 bg-white/5 rounded" />
          <div className="w-full h-3.5 bg-white/5 rounded" />
          <div className="w-2/3 h-3.5 bg-white/5 rounded" />
        </div>

        {/* Footer */}
        <div className="flex justify-end items-center pt-3 mt-3 border-t border-white/5">
          <div className="w-20 h-7 bg-white/5 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
// #endregion

// #region Empty State
function EmptyFeed() {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4">
      <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-4">
        <Inbox size={40} className="text-text-tertiary" />
      </div>
      <h3 className="text-lg font-semibold mb-2">아직 리뷰가 없어요</h3>
      <p className="text-sm text-text-secondary text-center max-w-xs">
        셀럽들의 콘텐츠 리뷰가 곧 업데이트됩니다.
        <br />
        조금만 기다려 주세요!
      </p>
    </div>
  );
}
// #endregion

// #region Section Header with Filter
interface FeedHeaderProps {
  currentType: string;
  onTypeChange: (type: string) => void;
  contentTypeCounts?: ContentTypeCounts;
}

function FeedHeader({ currentType, onTypeChange, contentTypeCounts }: FeedHeaderProps) {
  return (
    <div className="mb-4 space-y-3">
      {/* 타이틀 */}
      <div className="flex items-center gap-2">
        <div className="w-1 h-5 bg-accent rounded-full" />
        <TrendingUp size={18} className="text-accent" />
        <h2 className="text-lg font-bold">셀럽 피드</h2>
      </div>

      {/* 필터 탭 */}
      <div className="overflow-x-auto scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
        <div className="flex gap-2">
          {CONTENT_TYPES.map(({ value, label, icon: Icon }) => {
            const isActive = currentType === value;
            const count = contentTypeCounts?.[value];
            return (
              <Button
                unstyled
                key={value}
                onClick={() => onTypeChange(value)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap shrink-0 ${
                  isActive
                    ? "bg-accent text-white"
                    : "bg-white/5 text-text-secondary hover:bg-white/10 hover:text-text-primary"
                }`}
              >
                <Icon size={14} />
                {label}
                {count !== undefined && (
                  <span className={isActive ? "text-white/80" : "text-text-tertiary"}>
                    ({count.toLocaleString()})
                  </span>
                )}
              </Button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
// #endregion

interface CelebFeedProps {
  initialReviews?: CelebReview[];
  contentTypeCounts?: ContentTypeCounts;
}

export default function CelebFeed({ initialReviews = [], contentTypeCounts }: CelebFeedProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const contentType = searchParams.get("type") ?? "all";

  const [reviews, setReviews] = useState<CelebReview[]>(initialReviews);
  const [isLoading, setIsLoading] = useState(initialReviews.length === 0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  // 콘텐츠 타입 변경 핸들러
  const handleTypeChange = useCallback((type: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (type === "all") {
      params.delete("type");
    } else {
      params.set("type", type);
    }
    router.push(`?${params.toString()}`, { scroll: false });
  }, [router, searchParams]);

  // 초기 데이터 또는 타입 변경 시 로드
  const loadInitial = useCallback(async () => {
    setIsLoading(true);
    const result = await getCelebFeed({ contentType, limit: 10 });
    setReviews(result.reviews);
    setCursor(result.nextCursor);
    setHasMore(result.hasMore);
    setIsLoading(false);
  }, [contentType]);

  // 추가 데이터 로드
  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore || !cursor) return;

    setIsLoadingMore(true);
    const result = await getCelebFeed({ contentType, cursor, limit: 10 });
    setReviews((prev) => [...prev, ...result.reviews]);
    setCursor(result.nextCursor);
    setHasMore(result.hasMore);
    setIsLoadingMore(false);
  }, [contentType, cursor, hasMore, isLoadingMore]);

  // 콘텐츠 타입 변경 시 리셋
  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  if (isLoading) {
    return (
      <section>
        <FeedHeader currentType={contentType} onTypeChange={handleTypeChange} contentTypeCounts={contentTypeCounts} />
        <div className="space-y-4">
          <ReviewCardSkeleton />
          <ReviewCardSkeleton />
          <ReviewCardSkeleton />
        </div>
      </section>
    );
  }

  if (reviews.length === 0) {
    return (
      <section>
        <FeedHeader currentType={contentType} onTypeChange={handleTypeChange} contentTypeCounts={contentTypeCounts} />
        <EmptyFeed />
      </section>
    );
  }

  return (
    <section>
      <FeedHeader currentType={contentType} onTypeChange={handleTypeChange} contentTypeCounts={contentTypeCounts} />
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

        {/* 더보기 버튼 */}
        <LoadMoreButton
          onClick={loadMore}
          isLoading={isLoadingMore}
          hasMore={hasMore}
        />

        {/* 더 이상 로드할 데이터 없음 */}
        {!hasMore && reviews.length > 0 && (
          <div className="text-center py-6">
            <p className="text-sm text-text-tertiary">모든 리뷰를 불러왔어요</p>
          </div>
        )}
      </div>
    </section>
  );
}
