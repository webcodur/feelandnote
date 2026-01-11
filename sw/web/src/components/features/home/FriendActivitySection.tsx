"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Users, ChevronRight, Plus, RefreshCw, Star, Inbox } from "lucide-react";
import { Card, Avatar } from "@/components/ui";
import { getFeedActivities, type FeedActivity } from "@/actions/activity";
import type { ActivityActionType } from "@/types/database";

// #region Constants
const ACTION_LABELS: Record<ActivityActionType, string> = {
  CONTENT_ADD: "콘텐츠 추가",
  CONTENT_REMOVE: "콘텐츠 삭제",
  STATUS_CHANGE: "상태 변경",
  REVIEW_UPDATE: "리뷰 작성",
  RECORD_CREATE: "기록 생성",
  RECORD_UPDATE: "기록 수정",
  RECORD_DELETE: "기록 삭제",
};

const ACTION_ICONS: Record<ActivityActionType, typeof Plus> = {
  CONTENT_ADD: Plus,
  CONTENT_REMOVE: Plus,
  STATUS_CHANGE: RefreshCw,
  REVIEW_UPDATE: Star,
  RECORD_CREATE: Plus,
  RECORD_UPDATE: RefreshCw,
  RECORD_DELETE: Plus,
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
// #endregion

// #region Components
function ActivityItem({ activity }: { activity: FeedActivity }) {
  const ActionIcon = ACTION_ICONS[activity.action_type];

  return (
    <div className="flex items-center gap-3 py-2">
      <Avatar
        url={activity.user_avatar_url}
        name={activity.user_nickname}
        size="sm"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="font-medium text-sm truncate">
            {activity.user_nickname}
          </span>
          <span className="text-text-tertiary text-xs flex items-center gap-1 shrink-0">
            <ActionIcon size={10} />
            {ACTION_LABELS[activity.action_type]}
          </span>
        </div>
        {activity.content_title && (
          <p className="text-xs text-text-secondary truncate mt-0.5">
            {activity.content_title}
          </p>
        )}
      </div>
      <span className="text-xs text-text-tertiary shrink-0">
        {formatRelativeTime(activity.created_at)}
      </span>
    </div>
  );
}

function EmptyActivity() {
  return (
    <div className="text-center py-6">
      <Inbox size={32} className="mx-auto mb-2 text-text-tertiary opacity-50" />
      <p className="text-sm text-text-secondary">
        친구들의 활동이 없습니다
      </p>
    </div>
  );
}
// #endregion

interface FriendActivitySectionProps {
  userId: string;
}

export default function FriendActivitySection({ userId }: FriendActivitySectionProps) {
  const [activities, setActivities] = useState<FeedActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadActivities() {
      setIsLoading(true);
      const result = await getFeedActivities({ limit: 5 });
      setActivities(result.activities);
      setIsLoading(false);
    }
    loadActivities();
  }, [userId]);

  return (
    <section className="px-4">
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Users size={18} className="text-accent" />
            <h2 className="font-semibold">친구 활동</h2>
          </div>
          <Link
            href="/archive/feed"
            className="flex items-center gap-1 text-sm text-text-secondary hover:text-accent"
          >
            전체 보기
            <ChevronRight size={16} />
          </Link>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 py-2 animate-pulse">
                <div className="w-8 h-8 rounded-full bg-white/10" />
                <div className="flex-1 space-y-1">
                  <div className="w-32 h-4 bg-white/10 rounded" />
                  <div className="w-24 h-3 bg-white/10 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : activities.length === 0 ? (
          <EmptyActivity />
        ) : (
          <div className="divide-y divide-border">
            {activities.map((activity) => (
              <ActivityItem key={activity.id} activity={activity} />
            ))}
          </div>
        )}
      </Card>
    </section>
  );
}
