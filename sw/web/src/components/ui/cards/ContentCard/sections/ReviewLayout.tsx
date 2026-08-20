"use client";

import { Star } from "lucide-react";
import ContentImage from "@/components/ui/ContentImage";
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
    rating,
    onRatingClick,
    reviewIsOriginalLanguage,
    onStatsClick,
    reviewPresets,
    headerNode,
    className,
    heightClass = "h-[280px]",
    sourceUrl,
  } = props;

  const {
    ContentIcon,
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
    editionNoCover,
    activeEdition,
    effectiveCelebCount,
    effectiveUserCount,
    setIsBadgeHovered,
    setShowStatsModal,
    isSelected,
  } = state;

  const selectable = props.selectable;

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
      {/* 가로 레이아웃: 좌측 표지 + 우측 감상문 (화면 크기 무관 단일 형태) */}
      <div className={`relative group/card flex flex-col bg-bg-card border border-white/[0.06] rounded-xl overflow-hidden ${className || ""}`}>
        <CornerAccents radius="lg" />
        <CardHeader props={props} state={state} />
        <div
          onClick={handleClick}
          className="flex items-stretch gap-3 cursor-pointer w-full p-2"
        >
        {/* 썸네일 영역 */}
        <div className={`relative w-28 sm:w-40 flex-shrink-0 rounded-lg overflow-hidden bg-bg-secondary shadow-lg border border-white/5 ${heightClass}`}>
          {showImage ? (
            /* 표지 자리는 세로로 길어 잘라 채우면 좌우가 날아간다 — 제목이 읽히도록 전부 담는다 */
            <ContentImage
              src={displayThumbnail}
              alt={title}
              sizes="160px"
              className="object-contain transition-transform duration-300 delay-150 group-hover:scale-105"
              onError={() => setImageError(true)}
              onLoad={handleImageLoad}
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
                <p className="text-sm">{t("reviewModal.spoiler")}</p>
              </div>
            )}

            {!displayReview && (!reviewPresets || reviewPresets.length === 0) && (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-sm italic">{t("reviewModal.noReview")}</p>
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

      {props.effectsEnabled !== false && <CardModals props={props} state={state} />}
    </>
  );
}
