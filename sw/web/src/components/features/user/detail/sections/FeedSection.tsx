/*
  파일명: /components/features/user/detail/sections/FeedSection.tsx
  기능: 피드 섹션 컴포넌트
  책임: 리뷰, 노트, 창작물 등 피드 데이터를 로드하고 무한 스크롤을 처리한다.
*/ // ------------------------------
"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { Loader2, ArrowRight, Eye, EyeOff, Sparkles, Bot } from "lucide-react";
import { Card } from "@/components/ui";
import { BLUR_DATA_URL } from "@/constants/image";
import FeedPostCard from "./FeedPostCard";
import type { SubTab } from "../ArchiveDetailTabs";
import { getFeedRecords, type FeedRecord } from "@/actions/records";
import type { RecordType } from "@/actions/records";
import { getReviewFeed, type ReviewFeedItem } from "@/actions/contents/getReviewFeed";
import { getAiReviews, generateAiReview, type AiReviewItem } from "@/actions/ai";
import Button from "@/components/ui/Button";
import useDragScroll from "@/hooks/useDragScroll";
import FormattedText from "@/components/ui/FormattedText";

const PAGE_SIZE = 10;

interface FeedSectionProps {
  contentId: string;
  subTab: SubTab;
  viewUserId?: string;
  hasApiKey?: boolean;
  contentTitle?: string;
  contentType?: string;
}

const subTabToRecordType: Partial<Record<SubTab, RecordType>> = {
  note: "NOTE",
  creation: "CREATION",
};

// #region 리뷰 피드 카드
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

function ReviewFeedCard({ item }: { item: ReviewFeedItem }) {
  const [showSpoiler, setShowSpoiler] = useState(false);
  const nickname = item.user.nickname || "익명";
  const timeAgo = formatRelativeTime(item.updated_at);

  const {
    containerRef,
    scrollY,
    maxScroll,
    isDragging,
    canScroll,
    onMouseDown,
    onTouchStart,
    scrollStyle,
  } = useDragScroll();

  return (
    <Card className="p-0">
      <div className="p-2.5 flex items-center gap-2 border-b border-white/5">
        <div className="relative w-8 h-8 rounded-full text-lg flex items-center justify-center bg-bg-secondary overflow-hidden">
          {item.user.avatar_url ? (
            <Image src={item.user.avatar_url} alt={nickname} fill unoptimized className="object-cover" placeholder="blur" blurDataURL={BLUR_DATA_URL} />
          ) : (
            "⭐"
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-xs">{nickname}</div>
          <div className="text-[10px] text-text-secondary">{timeAgo}</div>
        </div>
        {item.rating && (
          <div className="text-yellow-400 text-xs">{"★".repeat(item.rating)}</div>
        )}
      </div>
      <div className="p-2.5">
        {item.is_spoiler && !showSpoiler ? (
          <Button
            unstyled
            onClick={() => setShowSpoiler(true)}
            className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-text-primary h-[80px]"
          >
            <EyeOff size={14} />
            <span>스포일러가 포함된 리뷰입니다. 클릭하여 보기</span>
          </Button>
        ) : (
          <div
            ref={containerRef}
            className={`h-[80px] overflow-hidden relative select-none ${canScroll ? "cursor-grab" : ""} ${isDragging ? "cursor-grabbing" : ""}`}
            onMouseDown={onMouseDown}
            onTouchStart={onTouchStart}
          >
            {/* 상단 그라데이션 */}
            {canScroll && scrollY > 0 && (
              <div className="absolute top-0 inset-x-0 h-4 bg-gradient-to-b from-bg-card to-transparent pointer-events-none z-10" />
            )}
            <div
              className="text-xs leading-relaxed text-text-secondary whitespace-pre-line"
              style={scrollStyle}
            >
              {item.is_spoiler && (
                <Button
                  unstyled
                  onClick={() => setShowSpoiler(false)}
                  className="inline-flex items-center gap-1 mr-1.5 text-red-400"
                >
                  <Eye size={12} />
                </Button>
              )}
                <FormattedText text={item.review} />
              </div>
              {/* 하단 그라데이션 */}
              {canScroll && scrollY < maxScroll && (
                <div className="absolute bottom-0 inset-x-0 h-4 bg-gradient-to-t from-bg-card to-transparent pointer-events-none" />
              )}
            </div>
          )}
        </div>
      </Card>
    );
  }
  // #endregion
  
  // #region AI 리뷰 카드
  function AiReviewCard({ item }: { item: AiReviewItem }) {
    const timeAgo = formatRelativeTime(item.created_at);
  
    const {
      containerRef,
      scrollY,
      maxScroll,
      isDragging,
      canScroll,
      onMouseDown,
      onTouchStart,
      scrollStyle,
    } = useDragScroll();
  
    return (
      <Card className="p-0 border-accent/30">
        <div className="p-2.5 flex items-center gap-2 border-b border-white/5">
          <div className="relative w-8 h-8 rounded-full flex items-center justify-center bg-accent/20">
            <Bot size={18} className="text-accent" />
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
          <div
            ref={containerRef}
            className={`h-[80px] overflow-hidden relative select-none ${canScroll ? "cursor-grab" : ""} ${isDragging ? "cursor-grabbing" : ""}`}
            onMouseDown={onMouseDown}
            onTouchStart={onTouchStart}
          >
            {canScroll && scrollY > 0 && (
              <div className="absolute top-0 inset-x-0 h-4 bg-gradient-to-b from-bg-card to-transparent pointer-events-none z-10" />
            )}
            <div
              className="text-xs leading-relaxed text-text-secondary whitespace-pre-line"
              style={scrollStyle}
            >
              <FormattedText text={item.review} />
            </div>
            {canScroll && scrollY < maxScroll && (
              <div className="absolute bottom-0 inset-x-0 h-4 bg-gradient-to-t from-bg-card to-transparent pointer-events-none" />
            )}
          </div>
        </div>
      </Card>
    );
  }
// #endregion

export default function FeedSection({ contentId, subTab, viewUserId, hasApiKey, contentTitle, contentType }: FeedSectionProps) {
  const [records, setRecords] = useState<FeedRecord[]>([]);
  const [reviews, setReviews] = useState<ReviewFeedItem[]>([]);
  const [aiReviews, setAiReviews] = useState<AiReviewItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [hasMore, setHasMore] = useState(false);

  const loadRecords = useCallback(async (offset = 0, append = false) => {
    if (offset === 0) {
      setIsLoading(true);
    } else {
      setIsLoadingMore(true);
    }

    try {
      // 리뷰 탭: user_contents에서 조회 + AI 리뷰
      if (subTab === "review") {
        const [reviewData, aiData] = await Promise.all([
          getReviewFeed({ contentId, limit: PAGE_SIZE, offset, excludeUserId: viewUserId }),
          offset === 0 ? getAiReviews({ contentId }) : Promise.resolve([]),
        ]);
        if (append) {
          setReviews((prev) => [...prev, ...reviewData]);
        } else {
          setReviews(reviewData);
          setAiReviews(aiData);
        }
        setHasMore(reviewData.length === PAGE_SIZE);
      } else {
        // 노트/창작 탭: records에서 조회
        const recordType = subTabToRecordType[subTab];
        if (!recordType) {
          setRecords([]);
          setIsLoading(false);
          return;
        }
        const data = await getFeedRecords({ contentId, type: recordType, limit: PAGE_SIZE, offset });
        if (append) {
          setRecords((prev) => [...prev, ...data]);
        } else {
          setRecords(data);
        }
        setHasMore(data.length === PAGE_SIZE);
      }
    } catch (error) {
      console.error("피드 로드 실패:", error);
      if (!append) {
        setRecords([]);
        setReviews([]);
        setAiReviews([]);
      }
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [contentId, subTab, viewUserId]);

  const handleGenerateAiReview = async () => {
    if (!contentTitle || !contentType) return;
    setIsGeneratingAi(true);
    try {
      const result = await generateAiReview({ contentId, contentTitle, contentType });
      if (result.success && result.data) {
        const { id, review, model, created_at } = result.data;
        setAiReviews((prev) => [{ id, review, model, created_at, isAi: true as const }, ...prev]);
      } else {
        alert(result.error || "AI 리뷰 생성에 실패했습니다.");
      }
    } catch (err) {
      console.error("AI 리뷰 생성 실패:", err);
      alert("AI 리뷰 생성에 실패했습니다.");
    } finally {
      setIsGeneratingAi(false);
    }
  };

  useEffect(() => {
    setRecords([]);
    setReviews([]);
    setAiReviews([]);
    loadRecords(0, false);
  }, [loadRecords]);

  const handleLoadMore = () => {
    const currentLength = subTab === "review" ? reviews.length : records.length;
    loadRecords(currentLength, true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={24} className="animate-spin text-accent" />
      </div>
    );
  }

  const isEmpty = subTab === "review" ? (reviews.length === 0 && aiReviews.length === 0) : records.length === 0;
  const showAiGenerateButton = subTab === "review" && hasApiKey && contentTitle && contentType;

  if (isEmpty && !showAiGenerateButton) {
    return (
      <Card className="animate-fade-in flex-1 flex items-center justify-center text-text-secondary text-sm">
        아직 다른 사람들의 기록이 없습니다.
      </Card>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col gap-3">
        {/* AI 리뷰 생성 버튼 */}
        {showAiGenerateButton && (
          <Button
            variant="secondary"
            size="sm"
            onClick={handleGenerateAiReview}
            disabled={isGeneratingAi}
            className="self-end gap-1.5"
            title={hasApiKey ? "AI 리뷰 생성" : "마이페이지 > 설정에서 API 키를 등록하세요"}
          >
            {isGeneratingAi ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Sparkles size={14} />
            )}
            AI 리뷰 만들기
          </Button>
        )}

        {/* AI 리뷰 목록 */}
        {subTab === "review" && aiReviews.map((item) => <AiReviewCard key={item.id} item={item} />)}

        {/* 일반 리뷰 목록 */}
        {subTab === "review"
          ? reviews.map((item) => <ReviewFeedCard key={item.id} item={item} />)
          : records.map((record) => <FeedPostCard key={record.id} record={record} />)}
      </div>

      {hasMore && (
        <Button
          unstyled
          onClick={handleLoadMore}
          disabled={isLoadingMore}
          className="mt-4 flex items-center gap-1 mx-auto px-4 py-2 text-xs text-accent hover:text-accent-hover"
        >
          {isLoadingMore ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <>
              <span>더보기</span>
              <ArrowRight size={14} />
            </>
          )}
        </Button>
      )}
    </div>
  );
}
