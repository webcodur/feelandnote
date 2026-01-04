"use client";

import { Card } from "@/components/ui";
import type { FeedRecord } from "@/actions/records";

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
        <div className="w-8 h-8 rounded-full text-lg flex items-center justify-center bg-bg-secondary overflow-hidden">
          {record.user.avatar_url ? (
            <img
              src={record.user.avatar_url}
              alt={nickname}
              className="w-full h-full object-cover"
            />
          ) : (
            avatar
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-xs">{nickname}</div>
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
    </Card>
  );
}
