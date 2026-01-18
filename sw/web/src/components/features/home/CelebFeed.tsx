"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Inbox } from "lucide-react";
import ReviewCard from "./ReviewCard";
import { LoadMoreButton, FilterTabs } from "@/components/ui";
import { getCelebFeed } from "@/actions/home";
import { CONTENT_TYPE_FILTERS, type ContentTypeFilterValue } from "@/constants/categories";
import { getCelebProfessionLabel } from "@/constants/celebProfessions";
import { formatRelativeTime } from "@/lib/utils/date";
import type { CelebReview } from "@/types/home";
import type { ContentTypeCounts } from "@/actions/home";

// #region Skeleton
function ReviewCardSkeleton() {
  return (
    <div className="bg-bg-card border border-border/50 rounded-xl overflow-hidden p-4 md:p-6 animate-pulse">
      {/* Desktop Skeleton */}
      <div className="hidden md:flex gap-6 h-[200px]">
        <div className="w-[160px] lg:w-[180px] h-full bg-white/5 shrink-0 rounded" />
        <div className="flex-1 space-y-4">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-full bg-white/10" />
             <div className="w-32 h-4 bg-white/10 rounded" />
          </div>
          <div className="space-y-2">
            <div className="w-full h-3 bg-white/5 rounded" />
            <div className="w-full h-3 bg-white/5 rounded" />
            <div className="w-2/3 h-3 bg-white/5 rounded" />
          </div>
        </div>
      </div>

      {/* Mobile Skeleton */}
      <div className="md:hidden space-y-4">
        <div className="flex items-center justify-between">
           <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-white/10" />
              <div className="w-20 h-3 bg-white/10 rounded" />
           </div>
           <div className="w-12 h-6 bg-white/10 rounded" />
        </div>
        <div className="flex gap-4 p-3 bg-white/5 rounded-lg">
           <div className="w-16 h-20 bg-white/10 rounded shrink-0" />
           <div className="flex-1 space-y-2 py-1">
              <div className="w-12 h-2 bg-white/10 rounded" />
              <div className="w-3/4 h-4 bg-white/10 rounded" />
              <div className="w-1/2 h-3 bg-white/10 rounded" />
           </div>
        </div>
        <div className="space-y-2">
           <div className="w-full h-3 bg-white/5 rounded" />
           <div className="w-2/3 h-3 bg-white/5 rounded" />
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
  currentType: ContentTypeFilterValue;
  onTypeChange: (type: ContentTypeFilterValue) => void;
  contentTypeCounts?: ContentTypeCounts;
}

function FeedHeader({ currentType, onTypeChange, contentTypeCounts }: FeedHeaderProps) {
  return (
    <div className="mb-4">
      <FilterTabs
        items={CONTENT_TYPE_FILTERS}
        activeValue={currentType}
        counts={contentTypeCounts}
        onSelect={onTypeChange}
        hideZeroCounts
        title="장르"
      />
    </div>
  );
}
// #endregion

interface CelebFeedProps {
  initialReviews?: CelebReview[];
  contentTypeCounts?: ContentTypeCounts;
  hideHeader?: boolean;
  hideFilter?: boolean;
  contentType?: ContentTypeFilterValue;
}

export default function CelebFeed({
  initialReviews = [],
  contentTypeCounts,
  hideHeader = false,
  hideFilter = false,
  contentType: externalContentType,
}: CelebFeedProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlContentType = (searchParams.get("type") ?? "all") as ContentTypeFilterValue;

  // 외부에서 전달받은 contentType 우선, 없으면 URL 파라미터 사용
  const contentType = externalContentType ?? urlContentType;

  const [reviews, setReviews] = useState<CelebReview[]>(initialReviews);
  const [isLoading, setIsLoading] = useState(initialReviews.length === 0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  // 콘텐츠 타입 변경 핸들러 (외부 제어가 아닐 때만 URL 업데이트)
  const handleTypeChange = useCallback((type: ContentTypeFilterValue) => {
    if (externalContentType !== undefined) return; // 외부 제어 시 무시
    const params = new URLSearchParams(searchParams.toString());
    if (type === "all") {
      params.delete("type");
    } else {
      params.set("type", type);
    }
    router.push(`?${params.toString()}`, { scroll: false });
  }, [router, searchParams, externalContentType]);

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
        {!hideFilter && <FeedHeader currentType={contentType} onTypeChange={handleTypeChange} contentTypeCounts={contentTypeCounts} />}
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
        {!hideFilter && <FeedHeader currentType={contentType} onTypeChange={handleTypeChange} contentTypeCounts={contentTypeCounts} />}
        <EmptyFeed />
      </section>
    );
  }

  return (
    <section>
      {!hideFilter && <FeedHeader currentType={contentType} onTypeChange={handleTypeChange} contentTypeCounts={contentTypeCounts} />}
      <div className="space-y-4">
        {reviews.map((review) => (
          <ReviewCard
            key={review.id}
            userId={review.celeb.id}
            userName={review.celeb.nickname}
            userAvatar={review.celeb.avatar_url}
            isOfficial={review.celeb.is_verified}
            userSubtitle={getCelebProfessionLabel(review.celeb.profession) || "지혜의 탐구자"}
            contentType={review.content.type}
            contentId={review.content.id}
            contentTitle={review.content.title}
            contentCreator={review.content.creator}
            contentThumbnail={review.content.thumbnail_url}
            review={review.review}
            timeAgo={formatRelativeTime(review.updated_at)}
            isSpoiler={review.is_spoiler}
          />
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
