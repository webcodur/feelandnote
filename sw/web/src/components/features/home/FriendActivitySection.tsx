"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Users, ChevronRight, Plus, Star, Inbox } from "lucide-react";
import { Avatar } from "@/components/ui";
import { getFeedActivities, type FeedActivity } from "@/actions/activity";
import { getCategoryByDbType } from "@/constants/categories";
import type { ActivityActionType } from "@/types/database";

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

const ACTION_CONFIG: Record<ActivityActionType, { icon: typeof Plus; verb: string; color: string }> = {
  CONTENT_ADD: { icon: Plus, verb: "추가했어요", color: "text-green-400" },
  REVIEW_UPDATE: { icon: Star, verb: "리뷰를 남겼어요", color: "text-yellow-400" },
  CONTENT_REMOVE: { icon: Plus, verb: "삭제했어요", color: "text-red-400" },
  STATUS_CHANGE: { icon: Plus, verb: "상태 변경", color: "text-blue-400" },
  RECORD_CREATE: { icon: Plus, verb: "기록 생성", color: "text-purple-400" },
  RECORD_UPDATE: { icon: Plus, verb: "기록 수정", color: "text-blue-400" },
  RECORD_DELETE: { icon: Plus, verb: "기록 삭제", color: "text-red-400" },
};
// #endregion

// #region Components
function ActivityCard({ activity }: { activity: FeedActivity }) {
  const config = ACTION_CONFIG[activity.action_type];
  const category = activity.content_type ? getCategoryByDbType(activity.content_type) : null;
  const CategoryIcon = category?.icon;

  const isReview = activity.action_type === "REVIEW_UPDATE";
  const hasReview = isReview && activity.review;

  return (
    <Link
      href={activity.content_id ? `/archive/${activity.content_id}` : "#"}
      className="block group"
    >
      <div className="flex gap-3 p-3 rounded-xl bg-bg-card hover:bg-white/5">
        {/* 썸네일 */}
        <div className="relative w-16 h-20 shrink-0 rounded-lg overflow-hidden bg-white/5">
          {activity.content_thumbnail ? (
            <Image
              src={activity.content_thumbnail}
              alt={activity.content_title || ""}
              fill
              className="object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              {CategoryIcon && <CategoryIcon size={24} className="text-white/20" />}
            </div>
          )}
        </div>

        {/* 정보 영역 */}
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          {/* 사용자 + 액션 */}
          <div className="flex items-center gap-1.5 mb-1">
            <Avatar
              url={activity.user_avatar_url}
              name={activity.user_nickname}
              size="xs"
            />
            <span className="font-medium text-sm truncate">{activity.user_nickname}</span>
            <span className={`text-xs ${config.color}`}>{config.verb}</span>
          </div>

          {/* 콘텐츠 제목 */}
          <p className="font-medium text-sm truncate mb-1">
            {activity.content_title || "콘텐츠"}
          </p>

          {/* 리뷰 미리보기 또는 별점 */}
          {hasReview ? (
            <p className="text-xs text-text-secondary line-clamp-1">
              "{activity.review}"
            </p>
          ) : activity.rating ? (
            <div className="flex items-center gap-1 text-yellow-400 text-xs">
              <Star size={12} fill="currentColor" />
              <span>{activity.rating}</span>
            </div>
          ) : (
            <span className="text-xs text-text-tertiary">
              {formatRelativeTime(activity.created_at)}
            </span>
          )}
        </div>

        {/* 카테고리 뱃지 */}
        {category && (
          <div className="self-start px-2 py-0.5 rounded-full bg-white/5 text-xs text-text-secondary">
            {category.label}
          </div>
        )}
      </div>
    </Link>
  );
}

function EmptyActivity() {
  return (
    <div className="text-center py-8 px-4 rounded-xl bg-bg-card">
      <Inbox size={32} className="mx-auto mb-2 text-text-tertiary opacity-50" />
      <p className="text-sm text-text-secondary mb-1">아직 친구들의 소식이 없어요</p>
      <p className="text-xs text-text-tertiary">친구를 팔로우하면 여기에 활동이 표시돼요</p>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex gap-3 p-3 rounded-xl bg-bg-card animate-pulse">
          <div className="w-16 h-20 rounded-lg bg-white/10" />
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-white/10" />
              <div className="w-24 h-3 bg-white/10 rounded" />
            </div>
            <div className="w-32 h-4 bg-white/10 rounded" />
            <div className="w-20 h-3 bg-white/10 rounded" />
          </div>
        </div>
      ))}
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
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Users size={18} className="text-accent" />
          <h2 className="font-semibold">친구 소식</h2>
        </div>
        <Link
          href="/archive/feed"
          className="flex items-center gap-1 text-sm text-text-secondary hover:text-accent"
        >
          더보기
          <ChevronRight size={16} />
        </Link>
      </div>

      {isLoading ? (
        <LoadingSkeleton />
      ) : activities.length === 0 ? (
        <EmptyActivity />
      ) : (
        <div className="space-y-2">
          {activities.map((activity) => (
            <ActivityCard key={activity.id} activity={activity} />
          ))}
        </div>
      )}
    </section>
  );
}
