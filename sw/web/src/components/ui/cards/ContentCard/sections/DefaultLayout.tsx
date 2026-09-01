"use client";

import { Link } from "@/i18n/navigation";
import ContentImage from "@/components/ui/ContentImage";

import {
  SelectOverlay,
  StatsBadge,
  IntroBadge,
} from "../slots";
import CardHeader from "./CardHeader";
import CardModals from "./CardModals";
import CornerAccents from "./CornerAccents";
import GenerativeBookCover from "./GenerativeBookCover";
import type { ContentCardProps } from "../types";
import type { ContentCardState } from "../useContentCardState";

interface DefaultLayoutProps {
  props: ContentCardProps;
  state: ContentCardState;
}

export default function DefaultLayout({ props, state }: DefaultLayoutProps) {
  const {
    title,
    creator,
    href,
    selectable,
    onStatsClick,
    className,
  } = props;

  const {
    ContentIcon,
    aspectClass,
    t,
    isSelected,
    showInfo,
    showGradient,
    showImage,
    displayThumbnail,
    displayTitle,
    displayCreator,
    setImageError,
    handleImageLoad,
    handleClick,
    editionUnavailable,
    editionNoCover,
    activeEdition,
    effectiveCelebCount,
    effectiveUserCount,
    isBadgeHovered,
    setIsBadgeHovered,
    setShowStatsModal,
    setShowIntroModal,
    selectableClass,
  } = state;

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
    return (
      <IntroBadge
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setShowIntroModal(true);
        }}
      />
    );
  };

  const cardContent = (
    <>
      <CardHeader props={props} state={state} />
      <div className={`relative ${aspectClass} overflow-hidden bg-bg-secondary`}>
        {showImage ? (
          <ContentImage
            src={displayThumbnail}
            alt={title}
            sizes="(max-width: 768px) 50vw, 25vw"
            className={`object-cover transition-transform duration-300 delay-150 ${selectable && isSelected ? "brightness-90" : !isBadgeHovered ? "scale-105" : ""}`}
            onError={() => setImageError(true)}
            onLoad={handleImageLoad}
          />
        ) : (
          <GenerativeBookCover
            title={displayTitle}
            ContentIcon={ContentIcon}
            iconSize={28}
            label={
              editionUnavailable
                ? (activeEdition === "ko" ? t("edition.noKoDesc") : t("edition.noEnDesc"))
                : editionNoCover
                  ? (activeEdition === "ko" ? t("edition.noCoverKo") : t("edition.noCoverEn"))
                  : undefined
            }
          />
        )}

        {showGradient && !editionUnavailable && (
          <div className="absolute inset-x-0 bottom-0 h-16 md:h-20 bg-gradient-to-t from-black/70 via-black/30 to-transparent pointer-events-none" />
        )}

        {props.overlayTopLeft && <div className="absolute left-1.5 top-1.5 z-10">{props.overlayTopLeft}</div>}
        {props.overlayTopRight && <div className="absolute right-1.5 top-1.5 z-10">{props.overlayTopRight}</div>}

        {renderBottomLeft()}
        {renderSelectOverlay()}
        {renderBottomRight()}

      </div>

      {showInfo && (
        <div className="bg-black/20 border-t border-white/[0.04] text-center">
          <div className="p-2 md:p-2.5 pb-1.5 flex items-center justify-center min-h-[36px] md:min-h-[42px]">
            <h3 className={`text-xs md:text-sm font-semibold text-text-primary line-clamp-2 leading-tight text-center ${!isBadgeHovered ? "group-hover:text-accent" : ""}`}>
              {editionUnavailable ? title : displayTitle}
            </h3>
          </div>
          <div className="h-px bg-white/10" />
          <div className="p-1.5 md:p-2 pt-1.5">
            <p className="text-[10px] md:text-xs text-text-secondary line-clamp-1 text-center">
              {editionUnavailable ? (creator ? creator.replace(/\^/g, ", ") : "\u00A0") : (displayCreator ? displayCreator.replace(/\^/g, ", ") : "\u00A0")}
            </p>
          </div>
        </div>
      )}
    </>
  );

  const containerClass = `group relative flex flex-col bg-bg-card border border-white/[0.06] rounded-xl overflow-hidden cursor-pointer ${selectableClass} ${className || ""}`;

  if (href && !selectable) {
    return (
      <div className="relative group/card">
        <CornerAccents />
        <Link href={href} className={containerClass} onClick={handleClick}>
          {cardContent}
        </Link>
        {props.posterFooterNode && <div className="mt-2">{props.posterFooterNode}</div>}
        {props.effectsEnabled !== false && <CardModals props={props} state={state} />}
      </div>
    );
  }

  return (
    <div className="relative group">
      <CornerAccents />
      <div className={containerClass} onClick={handleClick}>
        {cardContent}
      </div>
      {props.posterFooterNode && <div className="mt-2">{props.posterFooterNode}</div>}
      {props.effectsEnabled !== false && <CardModals props={props} state={state} />}
    </div>
  );
}
