"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { Star, Inbox } from "lucide-react";
import { Avatar, LoadMoreButton, FilterTabs } from "@/components/ui";
import { getFeedActivities, type FeedActivity, type FriendActivityTypeCounts } from "@/actions/activity";
import { getCategoryByDbType, CONTENT_TYPE_FILTERS, type ContentTypeFilterValue } from "@/constants/categories";
import { formatRelativeTime } from "@/lib/utils/date";
import { ACTION_CONFIG } from "@/lib/config/activity-actions";

// #region Components
function ActivityCard({ activity }: { activity: FeedActivity }) {
  const config = ACTION_CONFIG[activity.action_type];
  const category = activity.content_type ? getCategoryByDbType(activity.content_type) : null;
  const CategoryIcon = category?.icon;

  const isReview = activity.action_type === "REVIEW_UPDATE";
  const hasReview = isReview && activity.review;

  return (
    <Link
      href={activity.content_id ? `/archive/${activity.content_id}?userId=${activity.user_id}` : "#"}
      className="block group"
    >
      <div className="flex gap-3 p-3 rounded-xl bg-bg-card border border-border/50 hover:border-border hover:shadow-md hover:shadow-black/10">
        {/* 썸네일 */}
        <div className="relative w-12 h-16 lg:w-14 lg:h-[72px] shrink-0 rounded-lg overflow-hidden bg-white/5">
          {activity.content_thumbnail ? (
            <Image
              src={activity.content_thumbnail}
              alt={activity.content_title || ""}
              fill
              className="object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              {CategoryIcon && <CategoryIcon size={20} className="text-white/20" />}
            </div>
          )}
          {/* 타입 인디케이터 */}
          {category && (
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-1">
              <span className="text-[8px] text-white/80">{category.label}</span>
            </div>
          )}
        </div>

        {/* 정보 영역 */}
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          {/* 사용자 + 액션 */}
          <div className="flex items-center gap-1.5 mb-0.5">
            <Avatar
              url={activity.user_avatar_url}
              name={activity.user_nickname}
              size="sm"
            />
            <span className="font-medium text-xs truncate">{activity.user_nickname}</span>
            <span className={`text-[10px] ${config.color}`}>{config.verb}</span>
          </div>

          {/* 콘텐츠 제목 */}
          <p className="font-medium text-sm truncate group-hover:text-accent">
            {activity.content_title || "콘텐츠"}
          </p>

          {/* 리뷰 미리보기 또는 별점 */}
          {hasReview ? (
            <p className="text-xs text-text-secondary line-clamp-1 mt-0.5">
              "{activity.review}"
            </p>
          ) : activity.rating ? (
            <div className="flex items-center gap-1 text-yellow-400 text-xs mt-0.5">
              <Star size={10} fill="currentColor" />
              <span className="text-[10px]">{activity.rating}</span>
            </div>
          ) : (
            <span className="text-[10px] text-text-tertiary mt-0.5">
              {formatRelativeTime(activity.created_at)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

function EmptyActivity() {
  return (
    <div className="flex flex-col items-center justify-center py-10 px-4 rounded-xl bg-bg-card border border-border/50">
      <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3">
        <Inbox size={24} className="text-text-tertiary" />
      </div>
      <p className="text-sm text-text-secondary mb-1 text-center">아직 친구들의 소식이 없어요</p>
      <p className="text-xs text-text-tertiary text-center">친구를 팔로우하면 여기에 활동이 표시돼요</p>
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
  hideHeader?: boolean;
  activityTypeCounts?: FriendActivityTypeCounts;
}

export default function FriendActivitySection({ userId, hideHeader = false, activityTypeCounts }: FriendActivitySectionProps) {
  const [activities, setActivities] = useState<FeedActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [contentType, setContentType] = useState<ContentTypeFilterValue>("all");

  const loadActivities = useCallback(async (type: ContentTypeFilterValue, cursorValue?: string) => {
    if (cursorValue) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
    }

    const result = await getFeedActivities({
      limit: 5,
      cursor: cursorValue,
      contentType: type === "all" ? undefined : type,
    });

    if (cursorValue) {
      setActivities((prev) => [...prev, ...result.activities]);
    } else {
      setActivities(result.activities);
    }
    setCursor(result.nextCursor);
    setHasMore(!!result.nextCursor);
    setIsLoading(false);
    setIsLoadingMore(false);
  }, []);

  useEffect(() => {
    loadActivities(contentType);
  }, [userId, contentType, loadActivities]);

  const handleTypeChange = useCallback((type: ContentTypeFilterValue) => {
    setContentType(type);
    setCursor(null);
  }, []);

  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore || !cursor) return;
    loadActivities(contentType, cursor);
  }, [cursor, hasMore, isLoadingMore, contentType, loadActivities]);

  return (
    <section>
      {/* 콘텐츠 타입 필터 */}
      <div className="mb-4">
        <FilterTabs
          items={CONTENT_TYPE_FILTERS}
          activeValue={contentType}
          counts={activityTypeCounts}
          onSelect={handleTypeChange}
          hideZeroCounts
          title="장르"
        />
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
          <LoadMoreButton
            onClick={loadMore}
            isLoading={isLoadingMore}
            hasMore={hasMore}
            className="mt-3"
          />
        </div>
      )}
    </section>
  );
}
