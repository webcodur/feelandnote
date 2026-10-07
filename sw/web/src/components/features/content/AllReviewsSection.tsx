/*
  파일명: /components/features/content/AllReviewsSection.tsx
  기능: 모든 리뷰 피드 섹션
  책임: 다른 사용자들의 리뷰를 무한 스크롤로 표시한다.
*/ // ------------------------------
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, ArrowRight } from "lucide-react";
import Button from "@/components/ui/Button";
import { getReviewFeed, type ReviewFeedItem } from "@/actions/contents/getReviewFeed";

const PAGE_SIZE = 10;

import ReviewCard from "@/components/features/content/ReviewCard";
// #endregion

interface AllReviewsSectionProps {
  contentId: string;
  contentTitle: string;
  contentType: string;
  initialReviews: ReviewFeedItem[];
}

export default function AllReviewsSection({
  contentId,
  initialReviews,
}: AllReviewsSectionProps) {
  const t = useTranslations("contentDetail.review");
  const [reviews, setReviews] = useState<ReviewFeedItem[]>(initialReviews);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(initialReviews.length === PAGE_SIZE);

  const loadMoreReviews = async () => {
    setIsLoadingMore(true);
    try {
      const reviewData = await getReviewFeed({ contentId, limit: PAGE_SIZE, offset: reviews.length });
      setReviews((prev) => [...prev, ...reviewData]);
      setHasMore(reviewData.length === PAGE_SIZE);
    } catch (err) {
      console.error("리뷰 로드 실패:", err);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const isEmpty = reviews.length === 0;

  return (
    <div className="space-y-4">
      {isEmpty && (
        <div className="rounded-panel border border-line bg-bg-card px-4 py-6 text-center text-text-secondary text-sm">
          {t("noReviews")}
        </div>
      )}

      {/* 일반 리뷰 */}
      {reviews.map((item) => <ReviewCard key={item.id} item={item} />)}

      {/* 더보기 */}
      {hasMore && (
        <Button unstyled onClick={loadMoreReviews} disabled={isLoadingMore} className="flex min-h-11 items-center gap-2 mx-auto rounded-control border border-line bg-bg-raised px-5 text-sm text-text-secondary hover:border-line-strong hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
          {isLoadingMore ? <Loader2 size={14} className="animate-spin" /> : <><span>{t("loadMore")}</span><ArrowRight size={14} /></>}
        </Button>
      )}
    </div>
  );
}
