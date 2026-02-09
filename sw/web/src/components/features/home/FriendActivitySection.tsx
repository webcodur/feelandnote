"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Inbox, User } from "lucide-react";
import { SavedContentCard } from "@/components/ui/cards";
import { Avatar, TitleBadge, Modal, ModalBody, ModalFooter, LoadMoreButton, FilterTabs } from "@/components/ui";
import Button from "@/components/ui/Button";
import { getFeedActivities, type FeedActivity, type FriendActivityTypeCounts } from "@/actions/activity";
import { CONTENT_TYPE_FILTERS, getCategoryByDbType, type ContentTypeFilterValue } from "@/constants/categories";
import { formatRelativeTime } from "@/lib/utils/date";
import { ACTION_CONFIG } from "@/lib/config/activity-actions";

// #region Inline Friend Feed Card
function FriendFeedCard({ activity }: { activity: FeedActivity }) {
  const router = useRouter();
  const config = ACTION_CONFIG[activity.action_type];
  const [showUserModal, setShowUserModal] = useState(false);

  const category = getCategoryByDbType(activity.content_type!);

  const handleNavigateToUser = () => {
    setShowUserModal(false);
    router.push(`/${activity.user_id}`);
  };

  const headerNode = (
    <div className="flex items-center gap-2 sm:gap-3">
      <button
        type="button"
        className="flex-shrink-0 cursor-pointer"
        onClick={(e) => { e.stopPropagation(); setShowUserModal(true); }}
      >
        <Avatar url={activity.user_avatar_url} name={activity.user_nickname} size="sm" className="ring-1 ring-accent/30 rounded-full shadow-lg" />
      </button>
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            className="text-xs sm:text-sm font-bold text-text-primary tracking-tight hover:text-accent cursor-pointer truncate max-w-[80px] sm:max-w-none"
            onClick={(e) => { e.stopPropagation(); setShowUserModal(true); }}
          >
            {activity.user_nickname}
          </button>
          <TitleBadge title={activity.user_title ?? null} size="sm" />
        </div>
        <p className="text-[9px] sm:text-[10px] text-accent/60 font-medium font-sans uppercase tracking-wider">
          {config?.verb || "활동"} · {formatRelativeTime(activity.created_at)}
        </p>
      </div>
    </div>
  );

  return (
    <>
      <SavedContentCard
        contentId={activity.content_id!}
        contentType={activity.content_type!}
        title={activity.content_title || ""}
        creator={null}
        thumbnail={activity.content_thumbnail}
        review={activity.review!}
        isSpoiler={false}
        sourceUrl={activity.source_url}
        href={`/content/${activity.content_id}?category=${category?.id || "book"}`}
        ownerNickname={activity.user_nickname}
        headerNode={headerNode}
        heightClass="h-[320px] md:h-[280px]"
        className="sm:max-w-4xl sm:mx-auto"
      />

      <Modal isOpen={showUserModal} onClose={() => setShowUserModal(false)} title="기록관 방문" icon={User} size="sm" closeOnOverlayClick>
        <ModalBody>
          <p className="text-text-secondary">
            <span className="text-text-primary font-semibold">{activity.user_nickname}</span>
            님의 기록관으로 이동하시겠습니까?
          </p>
        </ModalBody>
        <ModalFooter className="justify-end">
          <Button variant="ghost" size="md" onClick={() => setShowUserModal(false)}>취소</Button>
          <Button variant="primary" size="md" onClick={handleNavigateToUser}>이동</Button>
        </ModalFooter>
      </Modal>
    </>
  );
}
// #endregion

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

function LoadingSkeletonCard() {
  return (
    <>
      {/* Desktop Skeleton */}
      <div className="hidden sm:block bg-bg-card border border-border/50 rounded-xl overflow-hidden p-4 md:p-6 animate-pulse max-w-4xl mx-auto">
        <div className="flex gap-6 md:h-[280px]">
          <div className="w-[160px] lg:w-[180px] h-full bg-white/5 shrink-0 rounded" />
          <div className="flex-1 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white/10" />
              <div className="w-32 h-4 bg-white/10 rounded" />
            </div>
            <div className="space-y-2">
              <div className="w-full h-3 bg-white/5 rounded" />
              <div className="w-full h-3 bg-white/5 rounded" />
              <div className="w-2/3 h-3 bg-white/5 rounded" />
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Skeleton - 포스터 카드 */}
      <div className="sm:hidden bg-[#1e1e1e] border border-white/10 rounded-lg overflow-hidden animate-pulse">
        <div className="px-2.5 py-2 flex items-center gap-2 border-b border-white/5">
          <div className="w-7 h-7 rounded-full bg-white/10 shrink-0" />
          <div className="space-y-1">
            <div className="w-14 h-2.5 bg-white/10 rounded" />
            <div className="w-9 h-2 bg-white/5 rounded" />
          </div>
        </div>
        <div>
          <div className="aspect-[2/3] bg-white/5" />
          <div className="px-2 py-1.5 space-y-1">
            <div className="w-3/4 h-2.5 bg-white/10 rounded" />
            <div className="w-1/2 h-2 bg-white/5 rounded" />
          </div>
        </div>
      </div>
    </>
  );
}

function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-1 sm:gap-4">
      {[1, 2, 3].map((i) => (
        <LoadingSkeletonCard key={i} />
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
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-1 sm:gap-4">
          {filteredActivities.map((activity) => (
            <FriendFeedCard key={activity.id} activity={activity} />
          ))}
          <div className="col-span-full">
            <LoadMoreButton
              onClick={loadMore}
              isLoading={isLoadingMore}
              hasMore={hasMore}
              className="mt-3"
            />
          </div>
        </div>
      )}
    </section>
  );
}
