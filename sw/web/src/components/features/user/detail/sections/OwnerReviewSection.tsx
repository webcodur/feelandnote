/*
  파일명: /components/features/user/detail/sections/OwnerReviewSection.tsx
  기능: 타인 리뷰 뷰 섹션
  책임: 콘텐츠 소유자의 리뷰를 읽기 전용으로 표시한다.
*/ // ------------------------------
"use client";

import { useState } from "react";
import Image from "next/image";
import { Eye, EyeOff } from "lucide-react";
import { Card } from "@/components/ui";
import Button from "@/components/ui/Button";
import useDragScroll from "@/hooks/useDragScroll";
import FormattedText from "@/components/ui/FormattedText";

interface OwnerReviewSectionProps {
  review: string | null;
  rating: number | null;
  isSpoiler: boolean;
  ownerNickname?: string | null;
  ownerAvatar?: string | null;
  updatedAt?: string | null;
}

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

export default function OwnerReviewSection({
  review,
  rating,
  isSpoiler,
  ownerNickname,
  ownerAvatar,
  updatedAt,
}: OwnerReviewSectionProps) {
  const [showSpoiler, setShowSpoiler] = useState(false);
  const nickname = ownerNickname || "익명";
  const timeAgo = updatedAt ? formatRelativeTime(updatedAt) : null;

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

  const hasReview = review && review.trim().length > 0;

  return (
    <div className="animate-fade-in">
      <Card className="p-0 mb-4">
        {/* 헤더 - 사용자 정보 */}
        <div className="p-3 border-b border-white/5 flex items-center gap-2">
          <div className="relative w-10 h-10 rounded-full text-lg flex items-center justify-center bg-bg-secondary overflow-hidden">
            {ownerAvatar ? (
              <Image src={ownerAvatar} alt={nickname} fill unoptimized className="object-cover" />
            ) : (
              "⭐"
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm">{nickname}의 감상</div>
            {timeAgo && <div className="text-[11px] text-text-secondary">{timeAgo}</div>}
          </div>
          {rating && (
            <div className="flex items-center gap-1">
              <div className="text-yellow-400 text-sm">{"★".repeat(rating)}</div>
              <span className="text-xs font-medium text-yellow-400">{rating}.0</span>
            </div>
          )}
        </div>

        {/* 본문 - 리뷰 내용 */}
        <div className="p-3">
          {!hasReview ? (
            <p className="text-sm text-text-secondary py-4 text-center">
              아직 작성된 리뷰가 없습니다.
            </p>
          ) : isSpoiler && !showSpoiler ? (
            <Button
              unstyled
              onClick={() => setShowSpoiler(true)}
              className="flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary py-8 w-full justify-center"
            >
              <EyeOff size={16} />
              <span>스포일러가 포함된 리뷰입니다. 클릭하여 보기</span>
            </Button>
          ) : (
            <div
              ref={containerRef}
              className={`min-h-[120px] max-h-[300px] overflow-hidden relative select-none ${canScroll ? "cursor-grab" : ""} ${isDragging ? "cursor-grabbing" : ""}`}
              onMouseDown={onMouseDown}
              onTouchStart={onTouchStart}
            >
              {canScroll && scrollY > 0 && (
                <div className="absolute top-0 inset-x-0 h-6 bg-gradient-to-b from-bg-card to-transparent pointer-events-none z-10" />
              )}
              <div
                className="text-sm leading-relaxed text-text-primary whitespace-pre-line"
                style={scrollStyle}
              >
                {isSpoiler && (
                  <Button
                    unstyled
                    onClick={() => setShowSpoiler(false)}
                    className="inline-flex items-center gap-1 mr-2 text-red-400 hover:text-red-300"
                  >
                    <Eye size={14} />
                    <span className="text-xs">스포일러</span>
                  </Button>
                )}
                <FormattedText text={review} />
              </div>
              {canScroll && scrollY < maxScroll && (
                <div className="absolute bottom-0 inset-x-0 h-6 bg-gradient-to-t from-bg-card to-transparent pointer-events-none" />
              )}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
