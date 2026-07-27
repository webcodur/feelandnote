"use client";

import Image from "next/image";
import { Star } from "lucide-react";
import { BLUR_DATA_URL } from "@/constants/image";
import FormattedText from "@/components/ui/FormattedText";
import { getPresetByKeyword, getSentimentColorClasses } from "@/constants/review-presets";

import {
  SelectOverlay,
  StatsBadge,
  RatingBadge,
} from "../slots";
import CardHeader from "./CardHeader";
import CardModals from "./CardModals";
import CornerAccents from "./CornerAccents";
import GenerativeBookCover from "./GenerativeBookCover";
import type { ContentCardProps } from "../types";
import type { ContentCardState } from "../useContentCardState";

interface ReviewLayoutProps {
  props: ContentCardProps;
  state: ContentCardState;
}

export default function ReviewLayout({ props, state }: ReviewLayoutProps) {
  const {
    title,
    creator,
    rating,
    onRatingClick,
    reviewIsOriginalLanguage,
    onStatsClick,
    reviewPresets,
    headerNode,
    className,
    heightClass = "h-[280px]",
    mobileLayout = "poster",
    sourceUrl,
  } = props;

  const {
    ContentIcon,
    aspectClass,
    t,
    isSpoiler,
    showImage,
    displayThumbnail,
    displayTitle,
    displayCreator,
    displayReview,
    setImageError,
    handleImageLoad,
    handleClick,
    editionUnavailable,
    editionNoCover,
    activeEdition,
    effectiveCelebCount,
    effectiveUserCount,
    setIsBadgeHovered,
    setShowStatsModal,
    isSelected,
  } = state;

  const selectable = props.selectable;

  const isMobileReview = mobileLayout === "review";
  const horizontalVisibility = isMobileReview ? "flex" : "hidden sm:flex";
  const verticalVisibility = isMobileReview ? "hidden" : "sm:hidden flex";

  const renderSelectOverlay = () => {
    if (!selectable) return null;
    return <SelectOverlay isSelected={isSelected} />;
  };

  const renderBottomLeft = () => {
    if (effectiveCelebCount === undefined) return null;
    const handleStatsClick = onStatsClick || ((e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setShowStatsModal(true);
    });
    return (
      <div
        onMouseEnter={() => setIsBadgeHovered(true)}
        onMouseLeave={() => setIsBadgeHovered(false)}
      >
        <StatsBadge celebCount={effectiveCelebCount} userCount={effectiveUserCount} onClick={handleStatsClick} />
      </div>
    );
  };

  const renderBottomRight = () => {
    if (rating || onRatingClick) {
      return <RatingBadge rating={rating ?? null} onClick={onRatingClick} />;
    }
    return null;
  };

  return (
    <>
      {/* 가로 레이아웃 (PC 기본, 모바일 옵션) */}
      <div className={`relative group/card ${horizontalVisibility} flex-col bg-bg-card border border-white/[0.06] rounded-xl overflow-hidden ${className || ""}`}>
        <CornerAccents radius="lg" />
        <CardHeader props={props} state={state} />
        <div
          onClick={handleClick}
          className="flex items-stretch gap-3 cursor-pointer w-full p-2"
        >
        {/* 썸네일 영역 */}
        <div className={`relative ${isMobileReview ? "w-28 sm:w-40" : "w-40"} flex-shrink-0 rounded-lg overflow-hidden bg-bg-secondary shadow-lg border border-white/5 ${heightClass}`}>
          {showImage ? (
            <Image
              src={displayThumbnail!}
              alt={title}
              fill
              sizes="160px"
              className="object-cover transition-transform duration-300 delay-150 group-hover:scale-105"
              placeholder="blur"
              blurDataURL={BLUR_DATA_URL}
              onError={() => setImageError(true)}
              onLoad={handleImageLoad}
              unoptimized
              loading="lazy"
            />
          ) : (
            <GenerativeBookCover
              title={displayTitle}
              ContentIcon={ContentIcon}
              iconSize={24}
              label={
                editionNoCover
                  ? (activeEdition === "ko" ? t("edition.noCoverKo") : t("edition.noCoverEn"))
                  : undefined
              }
            />
          )}
          {renderBottomLeft()}
          {renderSelectOverlay()}
          {renderBottomRight()}
        </div>

        {/* 리뷰 영역 */}
        <div className={`flex-1 min-w-0 flex flex-col ${heightClass} bg-[#1e1e1e] border border-white/10 rounded-lg overflow-hidden p-3 sm:p-4`}>
          {headerNode && (
            <div className="mb-2 pb-2 border-b border-white/5" onClick={(e) => e.stopPropagation()}>
              {headerNode}
            </div>
          )}

          <div className="mb-2">
            <h3
              className="text-xs sm:text-sm font-bold text-text-primary line-clamp-4 leading-tight group-hover:text-accent"
              title={displayTitle}
            >
              {displayTitle}
            </h3>
            {displayCreator && (
              <p className="text-[10px] sm:text-xs text-text-secondary line-clamp-1 mt-1">
                {displayCreator.replace(/\^/g, ", ")}
              </p>
            )}
          </div>

          {!headerNode && rating && (
            <div className="flex items-center gap-2 mb-2">
              <span className="flex items-center gap-1 text-xs text-text-primary font-medium">
                <Star size={12} className="text-yellow-500 fill-yellow-500" />
                {rating.toFixed(1)}
              </span>
            </div>
          )}

          <div className="flex-1 flex flex-col min-h-0">
            {/* 프리셋 먼저 표시 */}
            {reviewPresets && reviewPresets.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2 px-0.5">
                {reviewPresets.map((presetKeyword, idx) => {
                  const preset = getPresetByKeyword(presetKeyword);
                  const sentiment = preset?.sentiment || "etc";
                  const colorClasses = getSentimentColorClasses(sentiment);
                  return (
                    <span
                      key={`${presetKeyword}-${idx}`}
                      className={`px-2 py-0.5 rounded-full border text-[10px] sm:text-xs font-medium whitespace-nowrap ${colorClasses}`}
                    >
                      {presetKeyword}
                    </span>
                  );
                })}
              </div>
            )}

            {(displayReview && !isSpoiler) && (
              <div className="flex-1 relative min-h-0 overflow-hidden">
                {reviewIsOriginalLanguage && (
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-amber-200/65">
                    {t("reviewModal.originalLanguage")}
                  </p>
                )}
                <p className="text-[11px] sm:text-xs md:text-sm text-text-secondary leading-relaxed whitespace-pre-line break-words font-sans line-clamp-[8]">
                  <FormattedText text={displayReview} />
                </p>
                <div className="absolute bottom-0 inset-x-0 h-6 bg-gradient-to-t from-[#1e1e1e] to-transparent pointer-events-none" />
              </div>
            )}

            {displayReview && isSpoiler && (
              <div className="flex-1 flex items-center justify-center bg-white/5 rounded border border-white/5">
                <p className="text-sm text-text-tertiary">{t("reviewModal.spoiler")}</p>
              </div>
            )}

            {!displayReview && (!reviewPresets || reviewPresets.length === 0) && (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-sm text-text-tertiary/50 italic">{t("reviewModal.noReview")}</p>
              </div>
            )}
            {/* 출처 링크 (headerNode 모드에서는 비표시) */}
            {!headerNode && (
              <div className="mt-2 min-w-0 max-w-full overflow-hidden text-xs">
                {sourceUrl ? (
                  <a
                    href={sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={sourceUrl}
                    onClick={(e) => e.stopPropagation()}
                    className="block max-w-full truncate text-accent/60 hover:text-accent underline underline-offset-2"
                  >
                    {t("reviewModal.source", { url: sourceUrl })}
                  </a>
                ) : (
                  <span className="text-red-500 font-semibold">
                    {t("reviewModal.noSource")}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
        </div>
      </div>

      {/* 모바일: 포스터 카드 (mobileLayout='review'일 때 숨김) */}
      <div
        className={`${verticalVisibility} flex-col bg-bg-card border border-white/[0.06] rounded-xl overflow-hidden shadow-md ${className || ""}`}
      >
        <CardHeader props={props} state={state} />
        {headerNode && (
          <div className="px-2.5 py-2 flex justify-between items-start bg-black/20 border-b border-white/5" onClick={(e) => e.stopPropagation()}>
            <div className="flex-1">{headerNode}</div>
          </div>
        )}

        <div
          onClick={handleClick}
          className="cursor-pointer relative overflow-hidden bg-bg-secondary"
        >
          <div className={`${aspectClass} overflow-hidden relative bg-bg-secondary`}>
            {showImage ? (
              <Image
                src={displayThumbnail!}
                alt={title}
                fill
                sizes="(max-width: 768px) 100vw, 300px"
                className="object-cover"
                placeholder="blur"
                blurDataURL={BLUR_DATA_URL}
                onError={() => setImageError(true)}
                onLoad={handleImageLoad}
                unoptimized
                loading="lazy"
              />
            ) : (
              <GenerativeBookCover
                title={editionUnavailable ? title : displayTitle}
                ContentIcon={ContentIcon}
                iconSize={24}
                label={
                  editionUnavailable
                    ? (activeEdition === "ko" ? t("edition.noKoDesc") : t("edition.noEnDesc"))
                    : editionNoCover
                      ? (activeEdition === "ko" ? t("edition.noCoverKo") : t("edition.noCoverEn"))
                      : undefined
                }
              />
            )}
            {renderBottomLeft()}
            {renderSelectOverlay()}
            {renderBottomRight()}

          </div>

          <div className={`p-2 ${headerNode ? "bg-[#151515]" : ""}`}>
            <h3 className="text-[11px] font-bold text-text-primary line-clamp-2 leading-tight min-h-[28px]">
              {editionUnavailable ? title : displayTitle}
            </h3>
            <p className="text-[10px] text-text-secondary line-clamp-1 mt-1">
              {editionUnavailable ? (creator ? creator.replace(/\^/g, ", ") : "\u00A0") : (displayCreator ? displayCreator.replace(/\^/g, ", ") : "\u00A0")}
            </p>
          </div>
        </div>
      </div>

      <CardModals props={props} state={state} />
    </>
  );
}
