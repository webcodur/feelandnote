"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";
import { Inbox, User } from "lucide-react";
import { ContentCard } from "@/components/ui/cards";
import { Avatar, BlurDissolve, TitleBadge, Modal, ModalBody, ModalFooter, LoadMoreButton, FilterTabs } from "@/components/ui";
import Button from "@/components/ui/Button";
import { getCelebFeed } from "@/actions/home";
import { CONTENT_TYPE_FILTERS, type ContentTypeFilterValue } from "@/constants/categories";
import { formatRelativeTime } from "@/lib/utils/date";
import { checkContentsSaved } from "@/actions/contents/getMyContentIds";
import type { CelebReview } from "@/types/home";
import type { ContentTypeCounts } from "@/actions/home";
import { getCelebProfileUrl } from "@/lib/url";
import { useTranslations, useLocale } from "next-intl";
import { getLocalizedContent } from "@/lib/utils/editions";

// #region Inline Celeb Feed Card
interface CelebFeedCardProps {
  review: CelebReview;
  initialSaved?: boolean;
}

function CelebFeedCard({ review, initialSaved = false }: CelebFeedCardProps) {
  const router = useRouter();
  const [showUserModal, setShowUserModal] = useState(false);
  const t = useTranslations("home.ui");
  const tProf = useTranslations("profession");
  const locale = useLocale();

  const handleNavigateToUser = () => {
    setShowUserModal(false);
    router.push(getCelebProfileUrl(review.celeb));
  };

  const headerNode = (
    <div className="flex items-center gap-2 sm:gap-3">
      <button
        type="button"
        className="flex-shrink-0 cursor-pointer"
        onClick={(e) => { e.stopPropagation(); setShowUserModal(true); }}
      >
        <BlurDissolve>
          <Avatar url={review.celeb.avatar_url} name={review.celeb.nickname} size="sm" className="ring-1 ring-accent/30 rounded-full shadow-lg" />
        </BlurDissolve>
      </button>
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            className="text-xs sm:text-sm font-bold text-text-primary tracking-tight hover:text-accent cursor-pointer truncate max-w-[80px] sm:max-w-none"
            onClick={(e) => { e.stopPropagation(); setShowUserModal(true); }}
          >
            {review.celeb.nickname}
          </button>
          <TitleBadge title={null} size="sm" />
          {review.celeb.is_verified && (
            <span className="bg-[#d4af37] text-black text-[8px] px-1 py-0.5 font-black font-cinzel leading-none tracking-tight">
              OFFICIAL
            </span>
          )}
        </div>
        <p className="text-[9px] sm:text-[10px] text-accent/60 font-medium font-sans uppercase tracking-wider">
          {(review.celeb.profession && tProf.has(review.celeb.profession) ? tProf(review.celeb.profession) : review.celeb.profession) || t("wisdomSeeker")} · {formatRelativeTime(review.updated_at)}
        </p>
      </div>
    </div>
  );

  return (
    <>
      <ContentCard
        contentId={review.content.id}
        contentType={review.content.type}
        title={getLocalizedContent(review.content, locale).title}
        creator={getLocalizedContent(review.content, locale).creator}
        thumbnail={review.content.thumbnail_url}
        review={(locale === 'en' && review.review_en) ? review.review_en : review.review}
        isSpoiler={review.is_spoiler}
        sourceUrl={review.source_url}
        href=""
        ownerNickname={review.celeb.nickname}
        headerNode={headerNode}
        saved={initialSaved}
        mobileLayout="review"
        heightClass="h-[320px]"
        className="sm:max-w-4xl sm:mx-auto"
        titleKo={review.content.title_ko}
        titleEn={review.content.title_en}
        creatorEn={review.content.creator_en}
        thumbnailEn={review.content.thumbnail_en}
        hasEnEdition={review.content.has_en_edition}
      />

      <Modal isOpen={showUserModal} onClose={() => setShowUserModal(false)} title={t("visitArchive")} icon={User} size="sm" closeOnOverlayClick>
        <ModalBody>
          <p className="text-text-secondary">
            {t("visitArchiveConfirm", { name: review.celeb.nickname })}
          </p>
        </ModalBody>
        <ModalFooter className="justify-end">
          <Button variant="ghost" size="md" onClick={() => setShowUserModal(false)}>{t("cancel")}</Button>
          <Button variant="primary" size="md" onClick={handleNavigateToUser}>{t("go")}</Button>
        </ModalFooter>
      </Modal>
    </>
  );
}
// #endregion

// #region Skeleton
function ReviewCardSkeleton() {
  return (
    <div className="animate-pulse flex gap-3 bg-[#1e1e1e] border border-white/10 rounded-lg overflow-hidden p-3 sm:p-4 sm:max-w-4xl sm:mx-auto w-full h-[320px]">
      <div className="w-28 sm:w-[160px] lg:w-[180px] flex-shrink-0 bg-white/5 rounded-lg" />
      <div className="flex-1 space-y-3">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-7 sm:w-8 h-7 sm:h-8 rounded-full bg-white/10 shrink-0" />
          <div className="space-y-1">
            <div className="w-16 h-2.5 bg-white/10 rounded" />
            <div className="w-10 h-2 bg-white/5 rounded" />
          </div>
        </div>
        <div className="w-3/4 h-3 bg-white/10 rounded" />
        <div className="w-1/2 h-2.5 bg-white/5 rounded" />
        <div className="space-y-2 mt-2">
          <div className="w-full h-2.5 bg-white/5 rounded" />
          <div className="w-full h-2.5 bg-white/5 rounded" />
          <div className="w-2/3 h-2.5 bg-white/5 rounded" />
        </div>
      </div>
    </div>
  );
}
// #endregion

// #region Empty State
function EmptyFeed() {
  const t = useTranslations("home.ui");
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4">
      <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-4">
        <Inbox size={40} className="" />
      </div>
      <h3 className="text-lg font-semibold mb-2">{t("empty.noReviews")}</h3>
      <p className="text-sm text-text-secondary text-center max-w-xs whitespace-pre-line">
        {t("empty.noReviewsDesc")}
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
  const t = useTranslations("home.ui");
  return (
    <div className="mb-4">
      <FilterTabs
        items={CONTENT_TYPE_FILTERS}
        activeValue={currentType}
        counts={contentTypeCounts}
        onSelect={onTypeChange}
        hideZeroCounts
        title={t("genre")}
      />
    </div>
  );
}
// #endregion

interface CelebFeedProps {
  initialReviews?: CelebReview[];
  initialCursor?: string | null;
  initialHasMore?: boolean;
  contentTypeCounts?: ContentTypeCounts;
  hideFilter?: boolean;
  contentType?: ContentTypeFilterValue;
}

export default function CelebFeed({
  initialReviews,
  initialCursor,
  initialHasMore,
  contentTypeCounts,
  hideFilter = false,
  contentType: externalContentType,
}: CelebFeedProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations("home.ui");
  const urlContentType = (searchParams.get("type") ?? "all") as ContentTypeFilterValue;

  // 외부에서 전달받은 contentType 우선, 없으면 URL 파라미터 사용
  const contentType = externalContentType ?? urlContentType;

  const [reviews, setReviews] = useState<CelebReview[]>(initialReviews || []);
  const [isLoading, setIsLoading] = useState(initialReviews === undefined);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [cursor, setCursor] = useState<string | null>(initialCursor ?? null);
  const [hasMore, setHasMore] = useState(initialHasMore ?? true);
  const [savedContentIds, setSavedContentIds] = useState<Set<string> | null>(null);

  // 첫 렌더링 시 데이터가 있으면 로딩 스킵을 위한 ref
  const isFirstRender = useRef(true);

  // 저장 상태 배치 조회
  useEffect(() => {
    if (reviews.length === 0) return;
    const contentIds = reviews.map((r) => r.content.id);
    checkContentsSaved(contentIds).then(set => setSavedContentIds(set ?? new Set()));
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
        <div className="grid grid-cols-1 gap-0 divide-y divide-white/10 md:divide-y-0 md:gap-4">
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
      <div className="grid grid-cols-1 gap-0 divide-y divide-white/10 md:divide-y-0 md:gap-4">
        {reviews.map((review) => (
          <CelebFeedCard key={review.id} review={review} initialSaved={savedContentIds?.has(review.content.id) ?? false} />
        ))}

        {/* 로딩 스켈레톤 */}
        {isLoadingMore && (
          <>
            <ReviewCardSkeleton />
            <ReviewCardSkeleton />
          </>
        )}

        {/* 더보기 버튼 */}
        <div className="col-span-full">
          <LoadMoreButton
            onClick={loadMore}
            isLoading={isLoadingMore}
            hasMore={hasMore}
          />
        </div>

        {/* 더 이상 로드할 데이터 없음 */}
        {!hasMore && reviews.length > 0 && (
          <div className="col-span-full text-center py-6">
            <p className="text-sm">{t("empty.allLoaded")}</p>
          </div>
        )}
      </div>
    </section>
  );
}
