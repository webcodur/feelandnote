"use client";

import { useState } from "react";
import Image from "next/image";
import { Eye, EyeOff, Star } from "lucide-react";
import { FormattedText } from "@/components/ui";
import Button from "@/components/ui/Button";
import UserAvatarWithPopover from "@/components/shared/UserAvatarWithPopover";
import { BLUR_DATA_URL } from "@/constants/image";
import type { ReviewFeedItem } from "@/actions/contents/getReviewFeed";

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

interface ReviewCardProps {
  item: ReviewFeedItem;
  className?: string;
  isExpanded?: boolean; // 강제 전체 표시 (QuickRecord InfoPanel용)
}

export default function ReviewCard({ item, className = "", isExpanded = false }: ReviewCardProps) {
  const [showSpoiler, setShowSpoiler] = useState(false);
  const nickname = item.user.nickname || "익명";
  const timeAgo = formatRelativeTime(item.updated_at);

  return (
    <div className={`bg-bg-card border border-border rounded-xl ${className}`}>
      <div className="p-2.5 flex items-center gap-2 border-b border-white/5">
        <UserAvatarWithPopover
          userId={item.user.id}
          profileType={item.user.profile_type}
          trigger={
            <div className="relative w-8 h-8 md:w-10 md:h-10 rounded-full text-lg flex items-center justify-center bg-bg-secondary overflow-hidden hover:ring-2 hover:ring-accent/50 cursor-pointer transition-all">
              {item.user.avatar_url ? (
                <Image src={item.user.avatar_url} alt={nickname} fill unoptimized className="object-cover" placeholder="blur" blurDataURL={BLUR_DATA_URL} />
              ) : (
                "⭐"
              )}
            </div>
          }
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
             <span className="font-medium text-xs text-text-primary truncate">{nickname}</span>
             {item.user.profile_type === 'CELEB' && (
                 <span className="text-[10px] text-accent/80 border border-accent/20 px-1 rounded bg-accent/5">Celeb</span>
             )}
          </div>
          <div className="text-[10px] text-text-secondary">{timeAgo}</div>
        </div>
        {item.rating && (
            <div className="flex items-center gap-0.5 text-accent text-xs bg-accent/5 px-1.5 py-0.5 rounded-full border border-accent/10">
                <Star size={10} fill="currentColor" />
                <span>{item.rating}</span>
            </div>
        )}
      </div>
      <div className="p-3">
        {item.is_spoiler && !showSpoiler ? (
          <Button unstyled onClick={() => setShowSpoiler(true)} className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-text-primary py-4 w-full justify-center bg-white/5 rounded-lg border border-white/5 hover:bg-white/10 transition-colors">
            <EyeOff size={14} />
            <span>스포일러가 포함된 리뷰입니다. 클릭하여 보기</span>
          </Button>
        ) : (
          <div className={`${isExpanded ? '' : 'max-h-[200px] md:max-h-[300px] overflow-y-auto custom-scrollbar'}`}>
            <div className="text-sm leading-relaxed text-text-secondary whitespace-pre-wrap">
              {item.is_spoiler && (
                <Button unstyled onClick={() => setShowSpoiler(false)} className="inline-flex items-center gap-1 mr-1.5 text-red-400 hover:text-red-300 transition-colors" title="스포일러 다시 가리기">
                  <EyeOff size={12} />
                </Button>
              )}
              <FormattedText text={item.review} />
            </div>
          </div>
        )}
        {item.source_url && (
          <div className="mt-3 truncate pt-2 border-t border-white/5">
            <a
              href={item.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-text-tertiary hover:text-accent transition-colors flex items-center gap-1"
            >
              <span className="opacity-50">출처:</span> {item.source_url}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
