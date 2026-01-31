"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Inbox } from "lucide-react";
import ReviewCard from "./ReviewCard";
import { LoadMoreButton, FilterTabs } from "@/components/ui";
import { getFeedActivities, type FeedActivity, type FriendActivityTypeCounts } from "@/actions/activity";
import { CONTENT_TYPE_FILTERS, getCategoryByDbType, type ContentTypeFilterValue } from "@/constants/categories";
import { formatRelativeTime } from "@/lib/utils/date";
import { ACTION_CONFIG } from "@/lib/config/activity-actions";

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
          <div className="w-24 md:w-40 h-[180px] md:h-[280px] rounded-lg bg-white/10 shrink-0" />
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
  hideFilter?: boolean;
  contentType?: ContentTypeFilterValue;
  activityTypeCounts?: FriendActivityTypeCounts;
}

export default function FriendActivitySection({
  userId,
  hideFilter = false,
  contentType: externalContentType,
  activityTypeCounts,
}: FriendActivitySectionProps) {
  const [activities, setActivities] = useState<FeedActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [internalContentType, setInternalContentType] = useState<ContentTypeFilterValue>("all");

  // 외부에서 전달받은 contentType 우선, 없으면 내부 상태 사용
  const contentType = externalContentType ?? internalContentType;
  const setContentType = setInternalContentType;

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

  // 리뷰가 있는 활동만 필터링 (useMemo로 최적화)
  const filteredActivities = useMemo(
    () => activities.filter((activity) => activity.content_type && activity.review),
    [activities]
  );

  return (
    <section>
      {/* 콘텐츠 타입 필터 */}
      {!hideFilter && (
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
      )}

      {isLoading ? (
        <LoadingSkeleton />
      ) : filteredActivities.length === 0 ? (
        <EmptyActivity />
      ) : (
        <div className="space-y-4">
          {filteredActivities.map((activity) => {
            const config = ACTION_CONFIG[activity.action_type];
            return (
              <ReviewCard
                key={activity.id}
                userId={activity.user_id}
                userName={activity.user_nickname}
                userAvatar={activity.user_avatar_url}
                userTitle={activity.user_title}
                userSubtitle={config?.verb || "활동"}
                contentType={activity.content_type!}
                contentId={activity.content_id!}
                contentTitle={activity.content_title || ""}
                contentThumbnail={activity.content_thumbnail}
                review={activity.review!}
                timeAgo={formatRelativeTime(activity.created_at)}
                sourceUrl={activity.source_url}
                href={`/content/${activity.content_id}?category=${getCategoryByDbType(activity.content_type!)?.id || "book"}`}
              />
            );
          })}
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
