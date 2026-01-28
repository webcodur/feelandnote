/*
  파일명: /components/features/recommendations/RecommendationCard.tsx
  기능: 받은 추천 카드
  책임: 알림 페이지에서 받은 추천을 표시하고 수락/거절 UI를 제공한다.
*/ // ------------------------------
"use client";

import { useState } from "react";
import { Check, X, Star } from "lucide-react";
import Button from "@/components/ui/Button";
import { respondRecommendation } from "@/actions/recommendations";
import type { RecommendationWithDetails } from "@/types/recommendation";
import { getCategoryByDbType } from "@/constants/categories";

interface RecommendationCardProps {
  recommendation: RecommendationWithDetails;
  onRespond?: () => void;
}

export default function RecommendationCard({
  recommendation,
  onRespond,
}: RecommendationCardProps) {
  const [isResponding, setIsResponding] = useState(false);
  const [responded, setResponded] = useState(false);
  const [accepted, setAccepted] = useState(false);

  const { sender, user_content, message, created_at } = recommendation;
  const { content, rating } = user_content;

  const categoryInfo = getCategoryByDbType(content.type);

  const handleRespond = async (accept: boolean) => {
    setIsResponding(true);

    const result = await respondRecommendation({
      recommendationId: recommendation.id,
      accept,
    });

    setIsResponding(false);

    if (result.success) {
      setResponded(true);
      setAccepted(accept);
      onRespond?.();
    }
  };

  // 응답 완료 상태
  if (responded) {
    return (
      <div className="p-4 bg-surface rounded-xl">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center ${
              accepted ? "bg-green-500/20" : "bg-red-500/20"
            }`}
          >
            {accepted ? (
              <Check size={20} className="text-green-400" />
            ) : (
              <X size={20} className="text-red-400" />
            )}
          </div>
          <div>
            <p className="text-sm text-text-primary font-medium">
              {accepted ? "추천을 수락했습니다" : "추천을 거절했습니다"}
            </p>
            {accepted && (
              <p className="text-xs text-text-tertiary">
                원하는 목록에 추가되었습니다
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 시간 포맷팅
  const timeAgo = getTimeAgo(new Date(created_at));

  return (
    <div className="p-4 bg-surface rounded-xl space-y-3">
      {/* 헤더: 발신자 정보 */}
      <div className="flex items-center gap-3">
        {sender.avatar_url ? (
          <img
            src={sender.avatar_url}
            alt={sender.nickname}
            className="w-10 h-10 rounded-full object-cover"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-bg-card flex items-center justify-center">
            <span className="text-sm text-text-tertiary">
              {sender.nickname.charAt(0)}
            </span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm text-text-primary font-medium">
            {sender.nickname}님의 추천
          </p>
          <p className="text-xs text-text-tertiary">{timeAgo}</p>
        </div>
      </div>

      {/* 메시지 */}
      {message && (
        <p className="text-sm text-text-secondary italic">&ldquo;{message}&rdquo;</p>
      )}

      {/* 콘텐츠 카드 */}
      <div className="flex items-center gap-3 p-3 bg-bg-card rounded-xl">
        {content.thumbnail_url ? (
          <img
            src={content.thumbnail_url}
            alt={content.title}
            className="w-14 h-20 object-cover rounded-lg"
          />
        ) : (
          <div className="w-14 h-20 bg-surface rounded-lg flex items-center justify-center">
            {categoryInfo?.icon && (
              <categoryInfo.icon size={24} className="text-text-tertiary" />
            )}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm text-text-primary font-medium line-clamp-2">
            {content.title}
          </p>
          <p className="text-xs text-text-tertiary mt-0.5">
            {categoryInfo?.label ?? content.type}
            {content.creator && ` · ${content.creator}`}
          </p>
          {rating && (
            <div className="flex items-center gap-1 mt-1">
              <Star size={12} className="text-yellow-400 fill-yellow-400" />
              <span className="text-xs text-text-secondary">{rating}</span>
            </div>
          )}
        </div>
      </div>

      {/* 액션 버튼 */}
      <div className="flex gap-2">
        <Button
          unstyled
          onClick={() => handleRespond(false)}
          disabled={isResponding}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium bg-white/5 hover:bg-white/10 text-text-secondary border border-border disabled:opacity-50"
        >
          <X size={16} />
          거절
        </Button>
        <Button
          unstyled
          onClick={() => handleRespond(true)}
          disabled={isResponding}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium bg-accent hover:bg-accent-hover text-white disabled:opacity-50"
        >
          <Check size={16} />
          수락
        </Button>
      </div>
    </div>
  );
}

// 시간 포맷팅 헬퍼
function getTimeAgo(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (minutes < 1) return "방금 전";
  if (minutes < 60) return `${minutes}분 전`;
  if (hours < 24) return `${hours}시간 전`;
  if (days < 7) return `${days}일 전`;

  return date.toLocaleDateString("ko-KR", {
    month: "short",
    day: "numeric",
  });
}
