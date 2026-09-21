/*
  파일명: /components/features/user/contentLibrary/expand/ExpandCard.tsx
  기능: 펼침 보기의 카드 한 장.
  책임: 표지와 작품 소개, 인물의 감상배경을 한 덩어리로 쌓는다 — 소개 아래 가로선 하나를
        두고 감상배경이 이어진다. 감상배경 칸은 채울 것이 하나도 없는 기록에서 통째로 뺀다.
        소개는 표지 열이 정한 높이만큼만 보이고, 감상배경은 상자 높이를 두고 넘치는 긴 글을 그 안에서 굴린다.
        제목과 작품 선택 목록은 카드 밖의 ExpandDetailView가 맡는다.
*/ // ------------------------------
"use client";

import { memo, useState } from "react";
import { Star, ZoomIn } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import ContentImage from "@/components/ui/ContentImage";
import GenerativeBookCover from "@/components/ui/cards/ContentCard/sections/GenerativeBookCover";
import { TYPE_ICONS } from "@/components/ui/cards/ContentCard/constants";
import FormattedText from "@/components/ui/FormattedText";
import ImageViewerModal from "@/components/ui/ImageViewerModal";
import ContentTextModal from "@/components/ui/ContentTextModal";
import Button from "@/components/ui/Button";
import { getCategoryByDbType } from "@/constants/categories";
import { getLocalizedContent } from "@/lib/utils/editions";
import type { UserContentWithContent } from "@/actions/contents/getMyContents";
import type { ContentBrief } from "@/actions/contents/getContentBrief";

import ContentIntro from "./ContentIntro";
import ReviewScrollBox from "./ReviewScrollBox";
import { EXPAND_SECTION_HEADING_CLASS } from "./expandSectionStyles";
import BookPurchaseSummary from "@/components/features/commerce/BookPurchaseSummary";
import DeveloperCollectionJourney from "@/components/features/commerce/DeveloperCollectionJourney";
import { toAffiliateLinks } from "@/constants/affiliatePlatforms";

interface ExpandCardProps {
  item: UserContentWithContent;
  brief: ContentBrief | null;
  isBriefLoading: boolean;
  isRecordLoading: boolean;
  hasBriefError: boolean;
  hasRecordError: boolean;
  onRetryBrief: () => void;
  onRetryRecord: () => void;
  /** 화면에 지금 떠 있는 카드인지. 옆에 대기 중인 카드는 표지를 서둘러 받지 않는다 */
  isActive: boolean;
  /** 이 감상배경을 남긴 인물 이름 */
  ownerNickname?: string;
}

function ExpandCard({
  item,
  brief,
  isBriefLoading,
  isRecordLoading,
  hasBriefError,
  hasRecordError,
  onRetryBrief,
  onRetryRecord,
  isActive,
  ownerNickname,
}: ExpandCardProps) {
  const locale = useLocale();
  // 감상문 관련 문구(출처·스포일러·원문 안내)는 목록 카드와 같은 묶음을 쓴다
  const t = useTranslations("content");
  const tExpand = useTranslations("archiveSearch");
  const [isCoverOpen, setIsCoverOpen] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

  const { title, creator } = getLocalizedContent(item.content, locale);
  const review = locale === "en" && item.review_en ? item.review_en : item.review;
  const reviewIsOriginalLanguage = locale === "en" && !item.review_en && !!item.review;
  const isSpoiler = item.is_spoiler ?? false;
  const canExpandReview = !hasRecordError && !isRecordLoading && !!review && !isSpoiler;
  /* 감상배경 칸은 채울 것(글·별점·출처)이나 보여 줄 상태(불러오는 중·실패)가 하나도
     없을 때만 통째로 뺀다 — 소개만 남은 카드가 된다 */
  const showReview = hasRecordError || isRecordLoading || !!review || isSpoiler
    || (item.rating != null && item.rating > 0) || !!item.source_url;
  const reviewHeading = ownerNickname ? tExpand("expandReviewOf", { name: ownerNickname }) : tExpand("expandReview");
  const category = getCategoryByDbType(item.content.type)?.id ?? "book";
  const coverUrl = item.content.thumbnail_url;
  const purchaseLinks = toAffiliateLinks(item.content.affiliate_url);
  const hasBookPurchase = item.content.type === "BOOK";

  return (
    <>
      <article className="flex w-full shrink-0 flex-col overflow-hidden rounded-xl border border-white/[0.08] bg-bg-card">
        {/* 윗칸 — 표지와 작품 소개. 아래 감상배경 칸과 가로선 하나로 이어진다
            첫 행은 표지 높이에 고정하고 나머지는 둘째 행이 먹는다.
            소개가 두 행에 걸려도 첫 행이 늘어나지 않아 버튼이 표지 밑에 붙는다 */}
        <div className="grid grid-cols-1 gap-4 p-3 sm:grid-cols-[12rem_minmax(0,1fr)] sm:p-4 md:grid-rows-[min-content_1fr] md:gap-x-5 md:gap-y-2 md:p-5">
          <div data-testid="expand-cover" className="relative mx-auto w-36 shrink-0 sm:mx-0 sm:w-full">
          {coverUrl ? (
            <button
              type="button"
              onClick={() => setIsCoverOpen(true)}
              aria-label={tExpand("expandCover")}
              className="group relative block h-56 w-full cursor-zoom-in overflow-hidden rounded-lg border border-white/10 bg-bg-secondary shadow-lg hover:border-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70 sm:h-72"
            >
              {isActive ? (
                <ContentImage
                  src={coverUrl}
                  alt={title}
                  sizes="(max-width: 640px) 144px, 192px"
                  className="object-contain"
                  loading="eager"
                />
              ) : null}
              <span className="pointer-events-none absolute inset-0 flex items-end justify-end bg-black/0 p-2 group-hover:bg-black/15">
                <span className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-black/65 text-white/70 opacity-0 group-hover:opacity-100">
                  <ZoomIn size={16} aria-hidden />
                </span>
              </span>
            </button>
          ) : (
            <div className="relative h-56 w-full overflow-hidden rounded-lg border border-white/10 bg-bg-secondary shadow-lg sm:h-72">
              {/* 표지가 없으면 목록 카드와 같은 생성 표지를 그린다 */}
              <GenerativeBookCover
                title={title}
                ContentIcon={TYPE_ICONS[item.content.type]}
                iconSize={28}
              />
            </div>
          )}
          </div>

          {/* 소개 칸은 제 높이를 내지 않고(contain-size) 표지 열이 정한 높이만큼 늘어난다.
              소개가 아무리 길어도 행이 늘어나지 않아 버튼은 표지 바로 밑에 붙고, 소개는 그 높이 안에서만
              보이고 나머지는 접힌다(ContentIntro). 모바일은 표지 아래로 쌓이므로 제 높이를 낸다 */}
          <div className="min-w-0 sm:contain-size md:row-span-2">
            {hasBriefError ? (
              <div role="alert" className="rounded-lg border border-red-400/25 bg-red-400/[0.06] p-4 text-sm text-text-secondary">
                <p>{tExpand("loadFailed")}</p>
                <Button type="button" variant="secondary" size="sm" className="mt-3" onClick={onRetryBrief}>
                  {tExpand("retry")}
                </Button>
              </div>
            ) : (
              <div className="flex h-full flex-col">
                <div className="flex flex-col sm:min-h-0 sm:flex-1">
                  <ContentIntro brief={brief} category={category} isLoading={isBriefLoading} />
                </div>
              </div>
            )}
          </div>
          {hasBookPurchase && (
            /* 통합 구매 모듈 — 표지 아래 구매 자리. 값표+서점 마커를 누르면 서점별 링크·주의 안내가 든 창이 뜬다 */
            <BookPurchaseSummary
              contentId={item.content_id}
              title={title}
              creator={creator}
              links={purchaseLinks}
              enabled={item.content.type === "BOOK"}
              full
              className="sm:col-span-2 md:col-span-1 md:col-start-1 md:row-start-2 md:self-start"
            />
          )}
        </div>

        {/* 아래칸 — 이 인물이 왜 이 작품을 골랐는지. 이 서비스의 알맹이라
            윗칸과 가로선·바탕색으로 갈라 놓되 같은 카드 안에 이어 붙인다 */}
        {showReview && (
        <section className="border-t-2 border-accent/25 bg-accent/[0.04] px-3 py-5 sm:px-4 md:px-5 md:py-6">
          <div className="mb-4 flex flex-col items-center gap-0.5">
            <h4 className={EXPAND_SECTION_HEADING_CLASS}>{reviewHeading}</h4>
            {item.rating != null && item.rating > 0 && (
              <span className="flex items-center gap-1.5 text-sm font-medium text-text-secondary">
                <Star size={13} className="fill-yellow-500 text-yellow-500" />
                {item.rating.toFixed(1)}
              </span>
            )}
          </div>

          {hasRecordError ? (
            <div role="alert" className="rounded-lg border border-red-400/25 bg-red-400/[0.06] p-4 text-sm text-text-secondary">
              <p>{tExpand("loadFailed")}</p>
              <Button type="button" variant="secondary" size="sm" className="mt-3" onClick={onRetryRecord}>
                {tExpand("retry")}
              </Button>
            </div>
          ) : isRecordLoading ? (
            <div aria-hidden className="space-y-2 py-1">
              <div className="h-3 w-full animate-pulse rounded bg-white/[0.06]" />
              <div className="h-3 w-11/12 animate-pulse rounded bg-white/[0.06]" />
              <div className="h-3 w-4/5 animate-pulse rounded bg-white/[0.06]" />
            </div>
          ) : review && !isSpoiler ? (
            <>
              {reviewIsOriginalLanguage && (
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-200">
                  {t("reviewModal.originalLanguage")}
                </p>
              )}
              <ReviewScrollBox
                onOpen={() => setIsReviewModalOpen(true)}
                openLabel={tExpand("expandReviewExpand")}
              >
                <FormattedText text={review} />
              </ReviewScrollBox>
            </>
          ) : null}

          {!hasRecordError && !isRecordLoading && review && isSpoiler && (
            <div className="rounded-lg border border-white/5 bg-white/5 px-4 py-6 text-center text-sm text-text-secondary">
              {t("reviewModal.spoiler")}
            </div>
          )}

          {!hasRecordError && !isRecordLoading && !review && <p className="text-sm italic text-text-tertiary">{t("reviewModal.noReview")}</p>}
        </section>
        )}

        {isActive && !hasBookPurchase && (
          <DeveloperCollectionJourney
            target={{ title, creator: item.content.creator, type: item.content.type, contentId: item.content_id }}
            placement="celeb-review"
            showPreview={!isBriefLoading && (hasBriefError || !brief?.metadata?.previewUrl)}
            context={item.content.type === "MUSIC" ? "음반 소장" : item.content.type === "GAME" ? "게임 구매" : "연관 도서"}
          />
        )}
      </article>

      {isActive && coverUrl && isCoverOpen ? (
        <ImageViewerModal
          src={coverUrl}
          alt={title}
          isOpen
          onClose={() => setIsCoverOpen(false)}
        />
      ) : null}

      {isReviewModalOpen && canExpandReview ? (
        <ContentTextModal
          isOpen
          onClose={() => setIsReviewModalOpen(false)}
          title={reviewHeading}
          text={review}
          source={
            item.source_url
              ? { href: item.source_url, label: t("reviewModal.source") }
              : undefined
          }
          notice={
            reviewIsOriginalLanguage || !item.source_url ? (
              <>
                {reviewIsOriginalLanguage && (
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-amber-200">
                    {t("reviewModal.originalLanguage")}
                  </p>
                )}
                {!item.source_url && (
                  <p className="mb-3 text-sm font-semibold text-red-500">
                    {t("reviewModal.noSource")}
                  </p>
                )}
              </>
            ) : undefined
          }
        />
      ) : null}
    </>
  );
}

export default memo(ExpandCard);
