/*
  파일명: /components/features/archive/detail/sections/FeedSection.tsx
  기능: 피드 섹션 컴포넌트
  책임: 리뷰, 노트, 창작물 등 피드 데이터를 로드하고 무한 스크롤을 처리한다.
*/ // ------------------------------
"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { Loader2, ArrowRight, Eye, EyeOff } from "lucide-react";
import { Card } from "@/components/ui";
import FeedPostCard from "./FeedPostCard";
import type { SubTab } from "../ArchiveDetailTabs";
import { getFeedRecords, type FeedRecord } from "@/actions/records";
import type { RecordType } from "@/actions/records";
import { getReviewFeed, type ReviewFeedItem } from "@/actions/contents/getReviewFeed";
import Button from "@/components/ui/Button";

const PAGE_SIZE = 10;

interface FeedSectionProps {
  contentId: string;
  subTab: SubTab;
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

  return (
    <Card className="p-0">
      <div className="p-2.5 flex items-center gap-2 border-b border-white/5">
        <div className="relative w-8 h-8 rounded-full text-lg flex items-center justify-center bg-bg-secondary overflow-hidden">
          {item.user.avatar_url ? (
            <Image src={item.user.avatar_url} alt={nickname} fill unoptimized className="object-cover" />
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
            className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-text-primary"
          >
            <EyeOff size={14} />
            <span>스포일러가 포함된 리뷰입니다. 클릭하여 보기</span>
          </Button>
        ) : (
          <div className="text-xs leading-relaxed text-text-secondary line-clamp-4">
            {item.is_spoiler && (
              <Button
                unstyled
                onClick={() => setShowSpoiler(false)}
                className="inline-flex items-center gap-1 mr-1.5 text-red-400"
              >
                <Eye size={12} />
              </Button>
            )}
            {item.review}
          </div>
        )}
      </div>
    </Card>
  );
}
// #endregion

export default function FeedSection({ contentId, subTab }: FeedSectionProps) {
  const [records, setRecords] = useState<FeedRecord[]>([]);
  const [reviews, setReviews] = useState<ReviewFeedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);

  const loadRecords = useCallback(async (offset = 0, append = false) => {
    if (offset === 0) {
      setIsLoading(true);
    } else {
      setIsLoadingMore(true);
    }

    try {
      // 리뷰 탭: user_contents에서 조회
      if (subTab === "review") {
        const data = await getReviewFeed({ contentId, limit: PAGE_SIZE, offset });
        if (append) {
          setReviews((prev) => [...prev, ...data]);
        } else {
          setReviews(data);
        }
        setHasMore(data.length === PAGE_SIZE);
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
      }
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [contentId, subTab]);

  useEffect(() => {
    setRecords([]);
    setReviews([]);
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

  const isEmpty = subTab === "review" ? reviews.length === 0 : records.length === 0;

  if (isEmpty) {
    return (
      <div className="animate-fade-in text-center py-12 text-text-secondary text-sm">
        아직 다른 사람들의 기록이 없습니다.
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col gap-3">
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
