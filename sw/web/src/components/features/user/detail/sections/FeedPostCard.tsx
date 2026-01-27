/*
  파일명: /components/features/user/detail/sections/FeedPostCard.tsx
  기능: 피드 게시물 카드 컴포넌트
  책임: 노트, 인용구, 창작물 등 피드 아이템을 카드 형태로 표시한다.
*/ // ------------------------------
"use client";

import Image from "next/image";
import { Card, TitleBadge } from "@/components/ui";
import { BLUR_DATA_URL } from "@/constants/image";
import type { FeedRecord } from "@/actions/records";
import RecordInteractions from "../interactions/RecordInteractions";

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

function getDefaultAvatar(type: string): string {
  switch (type) {
    case "NOTE":
      return "📒";
    case "QUOTE":
      return "💬";
    case "CREATION":
      return "✨";
    default:
      return "📝";
  }
}

interface FeedPostCardProps {
  record: FeedRecord;
}

export default function FeedPostCard({ record }: FeedPostCardProps) {
  const avatar = record.user.avatar_url || getDefaultAvatar(record.type);
  const nickname = record.user.nickname || "익명";
  const timeAgo = formatRelativeTime(record.created_at);

  return (
    <Card className="p-0">
      <div className="p-2.5 flex items-center gap-2 border-b border-white/5">
        <div className="relative w-8 h-8 rounded-full text-lg flex items-center justify-center bg-bg-secondary overflow-hidden">
          {record.user.avatar_url ? (
            <Image
              src={record.user.avatar_url}
              alt={nickname}
              fill
              unoptimized
              className="object-cover"
              placeholder="blur"
              blurDataURL={BLUR_DATA_URL}
            />
          ) : (
            avatar
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-medium text-xs">{nickname}</span>
            <TitleBadge title={record.user.selected_title} size="sm" />
          </div>
          <div className="text-[10px] text-text-secondary">{timeAgo}</div>
        </div>
        {record.rating && (
          <div className="text-yellow-400 text-xs">
            {"★".repeat(record.rating)}
          </div>
        )}
        {record.location && (
          <span className="text-[10px] text-accent font-medium">
            {record.location}
          </span>
        )}
      </div>
      <div className="p-2.5">
        <div className="text-xs leading-relaxed text-text-secondary line-clamp-3">
          {record.content}
        </div>
      </div>
      <div className="px-2.5 pb-2.5">
           <RecordInteractions recordId={record.id} initialLikeCount={0} initialCommentCount={0} />
      </div>
    </Card>
  );
}
