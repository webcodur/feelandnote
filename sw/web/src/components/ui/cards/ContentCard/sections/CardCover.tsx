"use client";

import ContentCover from "@/components/ui/ContentCover";
import InteractiveMediaCover from "@/components/ui/media-objects/InteractiveMediaCover";
import { MEDIA_KINDS } from "@/components/ui/media-objects/MediaObject";
import NoEditionBadge from "@/components/ui/NoEditionBadge";
import { IntroBadge, SelectOverlay, StatsBadge } from "../slots";
import type { ContentCardProps } from "../types";
import type { ContentCardState } from "../useContentCardState";

/** 포스터·감상 카드가 공유하는 표지와 표지 위 조작 요소. */
export default function CardCover({ props, state, review = false }: {
  props: ContentCardProps;
  state: ContentCardState;
  review?: boolean;
}) {
  const { displayThumbnail, displayTitle, displayCreator, displayTitleBadge, ContentIcon,
    editionUnavailable, editionNoCover, activeEdition, t, showImage, showGradient,
    isSelected, isBadgeHovered, setImageError, handleImageLoad, effectiveCelebCount,
    effectiveUserCount, setIsBadgeHovered, setShowStatsModal, setShowIntroModal } = state;
  const physical = props.coverPresentation !== "flat" && showImage && !editionUnavailable && !editionNoCover;
  const coverHref = !props.selectable && (review || (!props.href && !props.onClick)) ? state.contentDetailUrl : undefined;
  const imageClass = review
    ? "object-contain transition-transform duration-300 delay-150 group-hover:scale-105"
    : props.imageFit === "contain"
      ? "object-contain group-hover/card:brightness-110"
      : `object-cover transition-transform duration-200 ${props.selectable && isSelected ? "brightness-90" : !isBadgeHovered ? "scale-105 group-hover/card:scale-110 group-hover/card:brightness-110" : ""}`;
  const label = editionUnavailable
    ? t(activeEdition === "ko" ? "edition.noKoDesc" : "edition.noEnDesc")
    : editionNoCover ? t(activeEdition === "ko" ? "edition.noCoverKo" : "edition.noCoverEn") : undefined;

  return <>
    {physical && <InteractiveMediaCover kind={MEDIA_KINDS[state.contentType]} image={displayThumbnail ?? undefined}
      title={displayTitle} creator={displayCreator ?? undefined} href={coverHref} />}
    {!physical && <ContentCover
      src={showImage && (!review || !editionUnavailable) ? displayThumbnail : null}
      alt={props.title} fallbackTitle={displayTitle}
      ContentIcon={displayTitleBadge ? undefined : ContentIcon}
      iconSize={review ? 24 : 28} label={label}
      sizes={review ? "160px" : "(max-width: 768px) 50vw, 25vw"}
      className={imageClass} onError={() => setImageError(true)} onLoad={handleImageLoad}
    />}
    {!physical && !review && showGradient && !editionUnavailable && (
      <div className="absolute inset-x-0 bottom-0 h-16 md:h-20 bg-gradient-to-t from-black/70 via-black/30 to-transparent pointer-events-none" />
    )}
    {props.overlayTopLeft && <div className="absolute start-1.5 top-1.5 z-10">{props.overlayTopLeft}</div>}
    <NoEditionBadge contentType={props.contentType ?? "BOOK"} variant="cover" badge={displayTitleBadge} />
    {props.overlayTopRight && <div className="absolute end-1.5 top-1.5 z-10">{props.overlayTopRight}</div>}
    {props.showStats !== false && effectiveCelebCount !== undefined && (
      <div onMouseEnter={() => setIsBadgeHovered(true)} onMouseLeave={() => setIsBadgeHovered(false)}>
        <StatsBadge celebCount={effectiveCelebCount} userCount={effectiveUserCount}
          onClick={props.onStatsClick ?? ((e) => {
            e.preventDefault(); e.stopPropagation(); setShowStatsModal(true);
          })} />
      </div>
    )}
    {props.selectable && <SelectOverlay isSelected={isSelected} />}
    {state.showIntro && <IntroBadge onClick={(e) => {
      e.preventDefault(); e.stopPropagation();
      setShowIntroModal(true);
    }} />}
  </>;
}
