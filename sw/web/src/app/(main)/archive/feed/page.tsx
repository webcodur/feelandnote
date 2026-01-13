/*
  파일명: /app/(main)/archive/feed/page.tsx
  기능: 피드 페이지
  책임: 팔로우한 사람들의 활동 타임라인을 표시한다.
*/

"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Card, Avatar, SectionHeader } from "@/components/ui";
import {
  Newspaper, Plus, Trash2, RefreshCw, Star, FileText, Inbox,
  Book, Film, Gamepad2, Music, Award
} from "lucide-react";
import { getFeedActivities, type FeedActivity } from "@/actions/activity";
import type { ActivityActionType, ContentType } from "@/types/database";

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
  CONTENT_REMOVE: Trash2,
  STATUS_CHANGE: RefreshCw,
  REVIEW_UPDATE: Star,
  RECORD_CREATE: FileText,
  RECORD_UPDATE: FileText,
  RECORD_DELETE: Trash2,
};

const CONTENT_TYPE_ICONS: Record<ContentType, typeof Book> = {
  BOOK: Book,
  VIDEO: Film,
  GAME: Gamepad2,
  MUSIC: Music,
  CERTIFICATE: Award,
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
function ActivityCard({ activity }: { activity: FeedActivity }) {
  const router = useRouter();
  const ActionIcon = ACTION_ICONS[activity.action_type];
  const ContentTypeIcon = activity.content_type ? CONTENT_TYPE_ICONS[activity.content_type] : null;

  const handleUserClick = () => router.push(`/archive/user/${activity.user_id}`);

  return (
    <Card className="p-4">
      <div className="flex gap-3">
        {/* 사용자 아바타 */}
        <button onClick={handleUserClick} className="shrink-0">
          <Avatar
            size="md"
            url={activity.user_avatar_url}
            name={activity.user_nickname}
          />
        </button>

        {/* 활동 내용 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <button
              onClick={handleUserClick}
              className="font-semibold text-sm hover:text-accent truncate"
            >
              {activity.user_nickname}
            </button>
            <span className="text-xs text-text-secondary flex items-center gap-1">
              <ActionIcon size={12} />
              {ACTION_LABELS[activity.action_type]}
            </span>
          </div>

          {/* 콘텐츠 정보 */}
          {activity.content_title && (
            <div className="flex items-center gap-2 mt-2 p-2 bg-white/5 rounded-lg">
              {activity.content_thumbnail ? (
                <div className="relative w-10 h-14 rounded overflow-hidden shrink-0">
                  <Image
                    src={activity.content_thumbnail}
                    alt=""
                    fill
                    unoptimized
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="w-10 h-14 bg-white/10 rounded flex items-center justify-center shrink-0">
                  {ContentTypeIcon && <ContentTypeIcon size={16} className="text-text-tertiary" />}
                </div>
              )}
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{activity.content_title}</div>
                {ContentTypeIcon && (
                  <div className="text-xs text-text-tertiary flex items-center gap-1 mt-0.5">
                    <ContentTypeIcon size={12} />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 리뷰/별점 */}
          {activity.action_type === "REVIEW_UPDATE" && (
            <div className="mt-2">
              {activity.rating && (
                <div className="flex items-center gap-1 text-yellow-400 text-sm mb-1">
                  <Star size={14} fill="currentColor" />
                  <span>{activity.rating}</span>
                </div>
              )}
              {activity.review && (
                <p className="text-sm text-text-secondary line-clamp-2">
                  "{activity.review}"
                </p>
              )}
            </div>
          )}

          {/* 시간 */}
          <div className="text-xs text-text-tertiary mt-2">
            {formatRelativeTime(activity.created_at)}
          </div>
        </div>
      </div>
    </Card>
  );
}

function EmptyFeed() {
  return (
    <div className="text-center py-16">
      <Inbox size={48} className="mx-auto mb-4 text-text-tertiary opacity-50" />
      <h3 className="text-lg font-semibold mb-2">아직 피드가 없어요</h3>
      <p className="text-sm text-text-secondary">
        다른 사용자를 팔로우하면 활동이 여기에 표시됩니다.
      </p>
    </div>
  );
}
// #endregion

export default function Page() {
  const [activities, setActivities] = useState<FeedActivity[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const loadActivities = useCallback(async (cursor?: string) => {
    if (cursor) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
    }

    const result = await getFeedActivities({ limit: 20, cursor });

    if (cursor) {
      setActivities((prev) => [...prev, ...result.activities]);
    } else {
      setActivities(result.activities);
    }
    setNextCursor(result.nextCursor);
    setIsLoading(false);
    setIsLoadingMore(false);
  }, []);

  useEffect(() => {
    loadActivities();
  }, [loadActivities]);

  return (
    <>
      <SectionHeader
        title="피드"
        description="팔로우한 사람들의 활동"
        icon={<Newspaper size={24} />}
        className="mb-6"
      />

      {isLoading ? (
        <div className="text-center py-20 text-text-secondary">
          <div className="animate-pulse">불러오는 중...</div>
        </div>
      ) : activities.length === 0 ? (
        <EmptyFeed />
      ) : (
        <div className="space-y-3">
          {activities.map((activity) => (
            <ActivityCard key={activity.id} activity={activity} />
          ))}

          {/* 더 보기 버튼 */}
          {nextCursor && (
            <button
              onClick={() => loadActivities(nextCursor)}
              disabled={isLoadingMore}
              className="w-full py-3 text-sm text-text-secondary hover:text-accent disabled:opacity-50"
            >
              {isLoadingMore ? "불러오는 중..." : "더 보기"}
            </button>
          )}
        </div>
      )}
    </>
  );
}
