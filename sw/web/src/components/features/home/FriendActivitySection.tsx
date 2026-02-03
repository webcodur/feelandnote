"use client";

import { useEffect, useState, useCallback, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Inbox, Check, User } from "lucide-react";
import { ContentCard } from "@/components/ui/cards";
import { Avatar, TitleBadge, Modal, ModalBody, ModalFooter, LoadMoreButton, FilterTabs } from "@/components/ui";
import Button from "@/components/ui/Button";
import { getFeedActivities, type FeedActivity, type FriendActivityTypeCounts } from "@/actions/activity";
import { CONTENT_TYPE_FILTERS, getCategoryByDbType, type ContentTypeFilterValue } from "@/constants/categories";
import { formatRelativeTime } from "@/lib/utils/date";
import { ACTION_CONFIG } from "@/lib/config/activity-actions";
import { addContent } from "@/actions/contents/addContent";
import { checkContentSaved } from "@/actions/contents/getMyContentIds";

// #region Inline Friend Feed Card
function FriendFeedCard({ activity }: { activity: FeedActivity }) {
  const router = useRouter();
  const config = ACTION_CONFIG[activity.action_type];
  const [isAdded, setIsAdded] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [isAdding, startTransition] = useTransition();
  const [showUserModal, setShowUserModal] = useState(false);

  const category = getCategoryByDbType(activity.content_type!);
  const contentTypeLabel = category?.shortLabel ?? activity.content_type;

  useEffect(() => {
    checkContentSaved(activity.content_id!).then((result) => {
      setIsAdded(result.saved);
      setIsChecking(false);
    });
  }, [activity.content_id]);

  const handleAddToArchive = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isAdded || isAdding) return;

    startTransition(async () => {
      const result = await addContent({
        id: activity.content_id!,
        type: activity.content_type!,
        title: activity.content_title || "",
        creator: undefined,
        thumbnailUrl: activity.content_thumbnail ?? undefined,
        status: "WANT",
      });
      if (result.success) setIsAdded(true);
    });
  };

  const handleNavigateToUser = () => {
    setShowUserModal(false);
    router.push(`/${activity.user_id}`);
  };

  const headerNode = (
    <div className="flex items-center gap-4 py-1">
      <button
        type="button"
        className="flex-shrink-0 cursor-pointer"
        onClick={(e) => { e.stopPropagation(); setShowUserModal(true); }}
      >
        <Avatar url={activity.user_avatar_url} name={activity.user_nickname} size="md" className="ring-1 ring-accent/30 rounded-full shadow-lg" />
      </button>
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="text-sm font-bold text-text-primary tracking-tight hover:text-accent cursor-pointer"
            onClick={(e) => { e.stopPropagation(); setShowUserModal(true); }}
          >
            {activity.user_nickname}
          </button>
          <TitleBadge title={activity.user_title ?? null} size="sm" />
        </div>
        <p className="text-[10px] text-accent/60 font-medium font-sans uppercase tracking-wider">
          {config?.verb || "활동"} · {formatRelativeTime(activity.created_at)}
        </p>
      </div>
    </div>
  );

  const actionNode = (
    <div>
      {isAdded ? (
        <div className="px-3 py-1.5 border border-accent/30 bg-black/80 backdrop-blur-md text-accent font-black text-[10px] tracking-tight flex items-center gap-1.5 rounded shadow-lg">
          <Check size={12} />
          <span>저장됨</span>
        </div>
      ) : (
        <button
          onClick={handleAddToArchive}
          disabled={isChecking || isAdding}
          className="px-3 py-1.5 border border-accent/50 bg-black/60 backdrop-blur-md text-accent hover:bg-accent hover:text-black font-black text-[10px] tracking-tight cursor-pointer disabled:cursor-wait rounded shadow-lg"
        >
          {isChecking ? "..." : isAdding ? "저장 중" : `${contentTypeLabel} 추가`}
        </button>
      )}
    </div>
  );

  return (
    <>
      <ContentCard
        contentId={activity.content_id!}
        contentType={activity.content_type!}
        title={activity.content_title || ""}
        creator={null}
        thumbnail={activity.content_thumbnail}
        status="FINISHED"
        review={activity.review!}
        isSpoiler={false}
        sourceUrl={activity.source_url}
        href={`/content/${activity.content_id}?category=${category?.id || "book"}`}
        ownerNickname={activity.user_nickname}
        headerNode={headerNode}
        actionNode={actionNode}
        heightClass="h-[320px] md:h-[280px]"
        className="max-w-4xl mx-auto"
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
          {filteredActivities.map((activity) => (
            <FriendFeedCard key={activity.id} activity={activity} />
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
