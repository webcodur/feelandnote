/*
  파일명: /components/features/content/AllReviewsSection.tsx
  기능: 모든 리뷰 피드 섹션
  책임: 다른 사용자들의 리뷰를 무한 스크롤로 표시한다.
*/ // ------------------------------
"use client";

import { useState } from "react";
import Image from "next/image";
import { Loader2, ArrowRight, Eye, EyeOff, Sparkles, Bot } from "lucide-react";
import { FormattedText } from "@/components/ui";
import Button from "@/components/ui/Button";
import UserAvatarWithPopover from "@/components/shared/UserAvatarWithPopover";
import { BLUR_DATA_URL } from "@/constants/image";
import { getReviewFeed, type ReviewFeedItem } from "@/actions/contents/getReviewFeed";
import { generateAiReview, type AiReviewItem } from "@/actions/ai";

const PAGE_SIZE = 10;

// #region 유틸
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) return "방금 전";
  if (diffMinutes < 60) return `${diffMinutes}분 전`;
  if (diffHours < 24) return `${diffHours}시간 전`;
  if (diffDays < 7) return `${diffDays}일 전`;
  return date.toLocaleDateString("ko-KR");
}
// #endregion

// #region 리뷰 카드
function ReviewCard({ item }: { item: ReviewFeedItem }) {
  const [showSpoiler, setShowSpoiler] = useState(false);
  const nickname = item.user.nickname || "익명";
  const timeAgo = formatRelativeTime(item.updated_at);

  return (
    <div className="bg-bg-card border border-border rounded-xl">
      <div className="p-2.5 flex items-center gap-2 border-b border-white/5">
        <UserAvatarWithPopover
          userId={item.user.id}
          profileType={item.user.profile_type}
          trigger={
            <div className="relative w-10 h-10 rounded-full text-lg flex items-center justify-center bg-bg-secondary overflow-hidden hover:ring-2 hover:ring-accent/50">
              {item.user.avatar_url ? (
                <Image src={item.user.avatar_url} alt={nickname} fill unoptimized className="object-cover" placeholder="blur" blurDataURL={BLUR_DATA_URL} />
              ) : (
                "⭐"
              )}
            </div>
          }
        />
        <div className="flex-1 min-w-0">
          <div className="font-medium text-xs">{nickname}</div>
          <div className="text-[10px] text-text-secondary">{timeAgo}</div>
        </div>
        {item.rating && <div className="text-yellow-400 text-xs">{"★".repeat(item.rating)}</div>}
      </div>
      <div className="p-2.5">
        {item.is_spoiler && !showSpoiler ? (
          <Button unstyled onClick={() => setShowSpoiler(true)} className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-text-primary py-4">
            <EyeOff size={14} />
            <span>스포일러가 포함된 리뷰입니다. 클릭하여 보기</span>
          </Button>
        ) : (
          <div className="max-h-[200px] md:max-h-[300px] overflow-y-auto custom-scrollbar">
            <div className="text-sm leading-relaxed text-text-secondary whitespace-pre-line">
              {item.is_spoiler && (
                <Button unstyled onClick={() => setShowSpoiler(false)} className="inline-flex items-center gap-1 mr-1.5 text-red-400">
                  <Eye size={12} />
                </Button>
              )}
              <FormattedText text={item.review} />
            </div>
          </div>
        )}
        {item.source_url && (
          <div className="mt-2 truncate">
            <a
              href={item.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-text-tertiary hover:text-accent"
            >
              출처: {item.source_url}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
// #endregion

// #region AI 리뷰 카드
function AiReviewCard({ item }: { item: AiReviewItem }) {
  const timeAgo = formatRelativeTime(item.created_at);

  return (
    <div className="bg-bg-card border border-accent/30 rounded-xl">
      <div className="p-2.5 flex items-center gap-2 border-b border-white/5">
        <div className="relative w-10 h-10 rounded-full flex items-center justify-center bg-accent/20">
          <Bot size={20} className="text-accent" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-xs flex items-center gap-1">
            <Sparkles size={10} className="text-accent" />
            {item.model}
          </div>
          <div className="text-[10px] text-text-secondary">{timeAgo}</div>
        </div>
      </div>
      <div className="p-2.5">
        <div className="max-h-[200px] md:max-h-[300px] overflow-y-auto custom-scrollbar">
          <div className="text-sm leading-relaxed text-text-secondary whitespace-pre-line">
            <FormattedText text={item.review} />
          </div>
        </div>
      </div>
    </div>
  );
}
// #endregion

interface AllReviewsSectionProps {
  contentId: string;
  contentTitle: string;
  contentType: string;
  hasApiKey: boolean;
  initialReviews: ReviewFeedItem[];
  initialAiReviews: AiReviewItem[];
}

export default function AllReviewsSection({
  contentId,
  contentTitle,
  contentType,
  hasApiKey,
  initialReviews,
  initialAiReviews,
}: AllReviewsSectionProps) {
  const [reviews, setReviews] = useState<ReviewFeedItem[]>(initialReviews);
  const [aiReviews, setAiReviews] = useState<AiReviewItem[]>(initialAiReviews);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
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

  const handleGenerateAi = async () => {
    setIsGeneratingAi(true);
    try {
      const result = await generateAiReview({ contentId, contentTitle, contentType });
      if (result.success && result.data) {
        const { id, review, model, created_at } = result.data;
        setAiReviews((prev) => [{ id, review, model, created_at, isAi: true as const }, ...prev]);
      }
    } catch (err) {
      console.error("AI 리뷰 생성 실패:", err);
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const isEmpty = reviews.length === 0 && aiReviews.length === 0;

  return (
    <div className="space-y-3">
      {/* AI 리뷰 생성 버튼 */}
      {hasApiKey && (
        <Button variant="secondary" size="sm" onClick={handleGenerateAi} disabled={isGeneratingAi} className="gap-1.5">
          {isGeneratingAi ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
          AI 리뷰 만들기
        </Button>
      )}

      {isEmpty && !hasApiKey && (
        <div className="py-8 text-center text-text-secondary text-sm">
          아직 작성된 리뷰가 없습니다
        </div>
      )}

      {/* AI 리뷰 */}
      {aiReviews.map((item) => <AiReviewCard key={item.id} item={item} />)}

      {/* 일반 리뷰 */}
      {reviews.map((item) => <ReviewCard key={item.id} item={item} />)}

      {/* 더보기 */}
      {hasMore && (
        <Button unstyled onClick={loadMoreReviews} disabled={isLoadingMore} className="flex items-center gap-1 mx-auto px-4 py-2 text-xs text-accent hover:text-accent-hover">
          {isLoadingMore ? <Loader2 size={14} className="animate-spin" /> : <><span>더보기</span><ArrowRight size={14} /></>}
        </Button>
      )}
    </div>
  );
}
