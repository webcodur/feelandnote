"use client";

import { useState } from "react";
import Link from "next/link";
import { Avatar, Card, Button } from "@/components/ui";
import { Star, MessageCircle, Heart, Share2, Book, Film, Gamepad2, Music, Award, AlertTriangle } from "lucide-react";
import type { CelebReview } from "@/types/home";
import type { ContentType } from "@/types/database";

// #region Constants
const CONTENT_TYPE_ICONS: Record<ContentType, typeof Book> = {
  BOOK: Book,
  VIDEO: Film,
  GAME: Gamepad2,
  MUSIC: Music,
  CERTIFICATE: Award,
};

const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  BOOK: "도서",
  VIDEO: "영상",
  GAME: "게임",
  MUSIC: "음악",
  CERTIFICATE: "자격증",
};
// #endregion

// #region Utils
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "방금 전";
  if (diffMins < 60) return `${diffMins}분 전`;
  if (diffHours < 24) return `${diffHours}시간 전`;
  if (diffDays < 7) return `${diffDays}일 전`;
  return date.toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
}

function renderStars(rating: number | null) {
  if (rating === null) return null;

  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          size={14}
          className={i < rating ? "text-yellow-400 fill-yellow-400" : "text-text-tertiary"}
        />
      ))}
    </div>
  );
}
// #endregion

interface CelebReviewCardProps {
  review: CelebReview;
}

export default function CelebReviewCard({ review }: CelebReviewCardProps) {
  const [showSpoiler, setShowSpoiler] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const ContentIcon = CONTENT_TYPE_ICONS[review.content.type] ?? Book;
  const contentTypeLabel = CONTENT_TYPE_LABELS[review.content.type] ?? "콘텐츠";
  const isLongReview = review.review.length > 150;
  const displayReview = isExpanded ? review.review : review.review.slice(0, 150);

  return (
    <Card className="p-4">
      {/* 헤더: 셀럽 정보 */}
      <div className="flex items-center justify-between mb-3">
        <Link href={`/archive/user/${review.celeb.id}`} className="flex items-center gap-2">
          <Avatar
            url={review.celeb.avatar_url}
            name={review.celeb.nickname}
            size="md"
            verified={review.celeb.is_verified}
          />
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">{review.celeb.nickname}</span>
            <span className="text-xs text-text-tertiary">·</span>
            <span className="text-xs text-text-tertiary">
              {formatRelativeTime(review.updated_at)}
            </span>
          </div>
        </Link>
        <Button variant="secondary" size="sm">
          팔로우
        </Button>
      </div>

      {/* 콘텐츠 정보 */}
      <div className="flex gap-3 bg-bg-secondary rounded-lg p-3 mb-3">
        {review.content.thumbnail_url ? (
          <img
            src={review.content.thumbnail_url}
            alt={review.content.title}
            className="w-14 h-20 object-cover rounded shrink-0"
          />
        ) : (
          <div className="w-14 h-20 bg-white/10 rounded flex items-center justify-center shrink-0">
            <ContentIcon size={24} className="text-text-tertiary" />
          </div>
        )}
        <div className="flex flex-col justify-center min-w-0">
          <h3 className="font-semibold text-sm truncate">{review.content.title}</h3>
          <div className="flex items-center gap-1 text-xs text-text-secondary mt-0.5">
            {review.content.creator && <span>{review.content.creator}</span>}
            {review.content.creator && <span>·</span>}
            <span>{contentTypeLabel}</span>
          </div>
          {review.rating !== null && (
            <div className="mt-1.5">{renderStars(review.rating)}</div>
          )}
        </div>
      </div>

      {/* 리뷰 텍스트 */}
      <div className="mb-3">
        {review.is_spoiler && !showSpoiler ? (
          <button
            onClick={() => setShowSpoiler(true)}
            className="flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary"
          >
            <AlertTriangle size={14} className="text-yellow-500" />
            <span>스포일러 포함 - 탭하여 보기</span>
          </button>
        ) : (
          <p className="text-sm text-text-primary leading-relaxed">
            {displayReview}
            {isLongReview && !isExpanded && "..."}
            {isLongReview && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="ml-1 text-accent text-sm"
              >
                {isExpanded ? "접기" : "더보기"}
              </button>
            )}
          </p>
        )}
      </div>

      {/* 액션 버튼 */}
      <div className="flex items-center gap-4 pt-2 border-t border-border">
        <button className="flex items-center gap-1.5 text-text-secondary hover:text-text-primary text-sm">
          <MessageCircle size={16} />
          <span>23</span>
        </button>
        <button className="flex items-center gap-1.5 text-text-secondary hover:text-red-400 text-sm">
          <Heart size={16} />
          <span>156</span>
        </button>
        <button className="flex items-center gap-1.5 text-text-secondary hover:text-text-primary text-sm ml-auto">
          <Share2 size={16} />
        </button>
      </div>
    </Card>
  );
}
