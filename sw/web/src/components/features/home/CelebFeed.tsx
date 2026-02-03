"use client";

import { useEffect, useState, useCallback, useRef, useTransition } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Inbox, Check, User } from "lucide-react";
import { ContentCard } from "@/components/ui/cards";
import { Avatar, TitleBadge, Modal, ModalBody, ModalFooter, LoadMoreButton, FilterTabs } from "@/components/ui";
import Button from "@/components/ui/Button";
import { getCelebFeed } from "@/actions/home";
import { CONTENT_TYPE_FILTERS, type ContentTypeFilterValue } from "@/constants/categories";
import { getCelebProfessionLabel } from "@/constants/celebProfessions";
import { formatRelativeTime } from "@/lib/utils/date";
import { addContent } from "@/actions/contents/addContent";
import { checkContentsSaved } from "@/actions/contents/getMyContentIds";
import { getCategoryByDbType } from "@/constants/categories";
import type { CelebReview } from "@/types/home";
import type { ContentTypeCounts } from "@/actions/home";
import type { ContentType } from "@/types/database";

// #region Inline Celeb Feed Card
interface CelebFeedCardProps {
  review: CelebReview;
  initialSaved?: boolean;
}

function CelebFeedCard({ review, initialSaved = false }: CelebFeedCardProps) {
  const router = useRouter();
  const [isAdded, setIsAdded] = useState(initialSaved);
  const [isAdding, startTransition] = useTransition();
  const [showUserModal, setShowUserModal] = useState(false);

  // initialSaved prop 변경 시 동기화
  useEffect(() => {
    setIsAdded(initialSaved);
  }, [initialSaved]);

  const category = getCategoryByDbType(review.content.type);
  const contentTypeLabel = category?.shortLabel ?? review.content.type;

  const handleAddToArchive = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isAdded || isAdding) return;

    startTransition(async () => {
      const result = await addContent({
        id: review.content.id,
        type: review.content.type,
        title: review.content.title,
        creator: review.content.creator ?? undefined,
        thumbnailUrl: review.content.thumbnail_url ?? undefined,
        status: "WANT",
      });
      if (result.success) setIsAdded(true);
    });
  };

  const handleNavigateToUser = () => {
    setShowUserModal(false);
    router.push(`/${review.celeb.id}`);
  };

  const headerNode = (
    <div className="flex items-center gap-4 py-1">
      <button
        type="button"
        className="flex-shrink-0 cursor-pointer"
        onClick={(e) => { e.stopPropagation(); setShowUserModal(true); }}
      >
        <Avatar url={review.celeb.avatar_url} name={review.celeb.nickname} size="md" className="ring-1 ring-accent/30 rounded-full shadow-lg" />
      </button>
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="text-sm font-bold text-text-primary tracking-tight hover:text-accent cursor-pointer"
            onClick={(e) => { e.stopPropagation(); setShowUserModal(true); }}
          >
            {review.celeb.nickname}
          </button>
          <TitleBadge title={null} size="sm" />
          {review.celeb.is_verified && (
            <span className="bg-[#d4af37] text-black text-[8px] px-1.5 py-0.5 font-black font-cinzel leading-none tracking-tight">
              OFFICIAL
            </span>
          )}
        </div>
        <p className="text-[10px] text-accent/60 font-medium font-sans uppercase tracking-wider">
          {getCelebProfessionLabel(review.celeb.profession) || "지혜의 탐구자"} · {formatRelativeTime(review.updated_at)}
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
          disabled={isAdding}
          className="px-3 py-1.5 border border-accent/50 bg-black/60 backdrop-blur-md text-accent hover:bg-accent hover:text-black font-black text-[10px] tracking-tight cursor-pointer disabled:cursor-wait rounded shadow-lg"
        >
          {isAdding ? "저장 중" : `${contentTypeLabel} 추가`}
        </button>
      )}
    </div>
  );

  return (
    <>
      <ContentCard
        contentId={review.content.id}
        contentType={review.content.type}
        title={review.content.title}
        creator={review.content.creator}
        thumbnail={review.content.thumbnail_url}
        status="FINISHED"
        review={review.review}
        isSpoiler={review.is_spoiler}
        sourceUrl={review.source_url}
        href=""
        ownerNickname={review.celeb.nickname}
        headerNode={headerNode}
        actionNode={actionNode}
        heightClass="h-[320px] md:h-[280px]"
        className="max-w-4xl mx-auto"
      />

      <Modal isOpen={showUserModal} onClose={() => setShowUserModal(false)} title="기록관 방문" icon={User} size="sm" closeOnOverlayClick>
        <ModalBody>
          <p className="text-text-secondary">
            <span className="text-text-primary font-semibold">{review.celeb.nickname}</span>
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

// #region Skeleton
function ReviewCardSkeleton() {
  return (
    <div className="bg-bg-card border border-border/50 rounded-xl overflow-hidden p-4 md:p-6 animate-pulse max-w-4xl mx-auto">
      {/* Desktop Skeleton */}
      <div className="hidden md:flex gap-6 md:h-[280px]">
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

      {/* Mobile Skeleton */}
      <div className="md:hidden space-y-4">
        <div className="flex items-center justify-between">
           <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-white/10" />
              <div className="w-20 h-3 bg-white/10 rounded" />
           </div>
           <div className="w-12 h-6 bg-white/10 rounded" />
        </div>
        <div className="flex gap-4 p-3 bg-white/5 rounded-lg">
           <div className="w-16 h-20 bg-white/10 rounded shrink-0" />
           <div className="flex-1 space-y-2 py-1">
              <div className="w-12 h-2 bg-white/10 rounded" />
              <div className="w-3/4 h-4 bg-white/10 rounded" />
              <div className="w-1/2 h-3 bg-white/10 rounded" />
           </div>
        </div>
        <div className="space-y-2">
           <div className="w-full h-3 bg-white/5 rounded" />
           <div className="w-2/3 h-3 bg-white/5 rounded" />
        </div>
      </div>
    </div>
  );
}
// #endregion

// #region Empty State
function EmptyFeed() {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4">
      <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-4">
        <Inbox size={40} className="text-text-tertiary" />
      </div>
      <h3 className="text-lg font-semibold mb-2">아직 리뷰가 없어요</h3>
      <p className="text-sm text-text-secondary text-center max-w-xs">
        셀럽들의 콘텐츠 리뷰가 곧 업데이트됩니다.
        <br />
        조금만 기다려 주세요!
      </p>
    </div>
  );
}
// #endregion

// #region Section Header with Filter
interface FeedHeaderProps {
  currentType: ContentTypeFilterValue;
  onTypeChange: (type: ContentTypeFilterValue) => void;
  contentTypeCounts?: ContentTypeCounts;
}

function FeedHeader({ currentType, onTypeChange, contentTypeCounts }: FeedHeaderProps) {
  return (
    <div className="mb-4">
      <FilterTabs
        items={CONTENT_TYPE_FILTERS}
        activeValue={currentType}
        counts={contentTypeCounts}
        onSelect={onTypeChange}
        hideZeroCounts
        title="장르"
      />
    </div>
  );
}
// #endregion

interface CelebFeedProps {
  initialReviews?: CelebReview[];
  contentTypeCounts?: ContentTypeCounts;
  hideFilter?: boolean;
  contentType?: ContentTypeFilterValue;
}

export default function CelebFeed({
  initialReviews,
  contentTypeCounts,
  hideFilter = false,
  contentType: externalContentType,
}: CelebFeedProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlContentType = (searchParams.get("type") ?? "all") as ContentTypeFilterValue;

  // 외부에서 전달받은 contentType 우선, 없으면 URL 파라미터 사용
  const contentType = externalContentType ?? urlContentType;

  const [reviews, setReviews] = useState<CelebReview[]>(initialReviews || []);
  const [isLoading, setIsLoading] = useState(initialReviews === undefined);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [savedContentIds, setSavedContentIds] = useState<Set<string>>(new Set());

  // 첫 렌더링 시 데이터가 있으면 로딩 스킵을 위한 ref
  const isFirstRender = useRef(true);

  // 저장 상태 배치 조회
  useEffect(() => {
    if (reviews.length === 0) return;
    const contentIds = reviews.map((r) => r.content.id);
    checkContentsSaved(contentIds).then(setSavedContentIds);
  }, [reviews]);

  // 콘텐츠 타입 변경 핸들러 (외부 제어가 아닐 때만 URL 업데이트)
  const handleTypeChange = useCallback((type: ContentTypeFilterValue) => {
    if (externalContentType !== undefined) return; // 외부 제어 시 무시
    const params = new URLSearchParams(searchParams.toString());
    if (type === "all") {
      params.delete("type");
    } else {
      params.set("type", type);
    }
    router.push(`?${params.toString()}`, { scroll: false });
  }, [router, searchParams, externalContentType]);

  // 초기 데이터 또는 타입 변경 시 로드
  const loadInitial = useCallback(async () => {
    setIsLoading(true);
    const result = await getCelebFeed({ contentType, limit: 10 });
    setReviews(result.reviews);
    setCursor(result.nextCursor);
    setHasMore(result.hasMore);
    setIsLoading(false);
  }, [contentType]);

  // 추가 데이터 로드
  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore || !cursor) return;

    setIsLoadingMore(true);
    const result = await getCelebFeed({ contentType, cursor, limit: 10 });
    setReviews((prev) => [...prev, ...result.reviews]);
    setCursor(result.nextCursor);
    setHasMore(result.hasMore);
    setIsLoadingMore(false);
  }, [contentType, cursor, hasMore, isLoadingMore]);

  // 콘텐츠 타입 변경 시 리셋
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      if (initialReviews !== undefined) return;
    }
    loadInitial();
  }, [loadInitial, initialReviews]);

  if (isLoading) {
    return (
      <section>
        {!hideFilter && <FeedHeader currentType={contentType} onTypeChange={handleTypeChange} contentTypeCounts={contentTypeCounts} />}
        <div className="space-y-4">
          <ReviewCardSkeleton />
          <ReviewCardSkeleton />
          <ReviewCardSkeleton />
        </div>
      </section>
    );
  }

  if (reviews.length === 0) {
    return (
      <section>
        {!hideFilter && <FeedHeader currentType={contentType} onTypeChange={handleTypeChange} contentTypeCounts={contentTypeCounts} />}
        <EmptyFeed />
      </section>
    );
  }

  return (
    <section>
      {!hideFilter && <FeedHeader currentType={contentType} onTypeChange={handleTypeChange} contentTypeCounts={contentTypeCounts} />}
      <div className="space-y-4">
        {reviews.map((review) => (
          <CelebFeedCard key={review.id} review={review} initialSaved={savedContentIds.has(review.content.id)} />
        ))}

        {/* 로딩 스켈레톤 */}
        {isLoadingMore && (
          <>
            <ReviewCardSkeleton />
            <ReviewCardSkeleton />
          </>
        )}

        {/* 더보기 버튼 */}
        <LoadMoreButton
          onClick={loadMore}
          isLoading={isLoadingMore}
          hasMore={hasMore}
        />

        {/* 더 이상 로드할 데이터 없음 */}
        {!hasMore && reviews.length > 0 && (
          <div className="text-center py-6">
            <p className="text-sm text-text-tertiary">모든 리뷰를 불러왔어요</p>
          </div>
        )}
      </div>
    </section>
  );
}
