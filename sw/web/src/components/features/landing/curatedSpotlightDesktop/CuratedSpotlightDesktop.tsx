"use client";

import Image from "next/image";
import { useTranslations, useLocale } from "next-intl";
import type { Locale } from "@/types/locale";
import { cn } from "@/lib/utils";
import type { FeaturedTag } from "@/actions/home";
import type { SpotlightLocation } from "../FeaturedSpotlight";
import type { DialogueSubtitleData } from "@/components/features/game/shared/hooks/useDialogue";
import { useCuratedSpotlight, SWIPE_THRESHOLD } from "./useCuratedSpotlight";
import CelebThumbnails from "./CelebThumbnails";
import SpotlightDetailModal from "./SpotlightDetailModal";

interface CuratedSpotlightDesktopProps {
  activeTag: FeaturedTag;
  location?: Exclude<SpotlightLocation, "explore-mb">;
  onSubtitle?: (data: DialogueSubtitleData) => void;
}

export default function CuratedSpotlightDesktop({ activeTag, location = "main", onSubtitle }: CuratedSpotlightDesktopProps) {
  const t = useTranslations("landing");
  const locale = useLocale() as Locale;
  const isExplore = location === "explore-pc";
  const spotlight = useCuratedSpotlight({ activeTag, locale, onSubtitle });
  const {
    selectedIndex,
    modalCeleb,
    setModalCeleb,
    modalCelebIndex,
    setModalCelebIndex,
    slideDirection,
    isTransitioning,
    isHeroDragging,
    dragOffset,
    heroHasDragged,
    celebs,
    heroCeleb,
    handleHeroDragStart,
    handleHeroDragMove,
    handleHeroDragEnd,
  } = spotlight;

  const celebThumbnails = (
    <CelebThumbnails spotlight={spotlight} isExplore={isExplore} activeTag={activeTag} />
  );

  const detailModal = (
    <SpotlightDetailModal
      modalCeleb={modalCeleb}
      modalCelebIndex={modalCelebIndex}
      celebs={celebs}
      setModalCeleb={setModalCeleb}
      setModalCelebIndex={setModalCelebIndex}
    />
  );

  // #region explore-pc 전용 2열 레이아웃
  if (isExplore) {
    return (
      <div className="max-w-5xl mx-auto overflow-hidden">
        {/* Hero Card + 썸네일 배열 */}
        <div
          className={cn(
            "flex flex-col gap-6 min-w-0 transition-all duration-300 ease-in-out",
            isTransitioning ? "opacity-0 translate-y-2 scale-[0.98]" : "opacity-100 translate-y-0 scale-100"
          )}
        >
          {/* Hero Card (텍스트 중심) */}
          <div
            className={cn(
              "group relative w-full overflow-hidden rounded-lg bg-[#0a0a0a] shadow-xl select-none",
              isHeroDragging ? "cursor-grabbing" : "cursor-grab"
            )}
            onMouseDown={(e) => handleHeroDragStart(e.clientX, e.clientY)}
            onMouseMove={(e) => handleHeroDragMove(e.clientX, e.clientY)}
            onMouseUp={handleHeroDragEnd}
            onMouseLeave={handleHeroDragEnd}
            onClick={() => !heroHasDragged.current && heroCeleb && (() => { setModalCeleb(heroCeleb); setModalCelebIndex(selectedIndex); })()}
          >
            <div
              key={selectedIndex}
              className={cn(
                "relative flex items-center gap-6 p-8",
                slideDirection === "left" && "animate-slide-in-right",
                slideDirection === "right" && "animate-slide-in-left"
              )}
              style={{
                transform: isHeroDragging ? `translateX(${dragOffset * 0.3}px)` : undefined,
                opacity: isHeroDragging ? 1 - Math.abs(dragOffset) * 0.002 : 1,
              }}
            >
              {/* 원형 아바타 */}
              <div className="flex-shrink-0 w-20 h-20 rounded-full overflow-hidden ring-2 ring-accent/30 ring-offset-2 ring-offset-[#0a0a0a]">
                {heroCeleb?.avatar_url ? (
                  <Image
                    src={heroCeleb.avatar_url}
                    alt={heroCeleb?.nickname ?? ""}
                    width={80}
                    height={80}
                    priority={selectedIndex === 0}
                    className="object-cover w-full h-full"
                  />
                ) : (
                  <div className="w-full h-full bg-neutral-800 flex items-center justify-center">
                    <span className="text-2xl text-white/20 font-serif font-black">{heroCeleb?.nickname?.[0]}</span>
                  </div>
                )}
              </div>

              {/* 텍스트 영역 */}
              <div className="flex-1 flex flex-col gap-2 min-w-0">
                <div className="flex flex-col gap-1">
                  {heroCeleb?.title && (
                    <span className="text-xs text-accent font-serif font-bold tracking-wider">{heroCeleb.title}</span>
                  )}
                  <h3 className="text-2xl font-serif font-black text-white leading-tight">{heroCeleb?.nickname}</h3>
                </div>

                {(locale === "en" ? (heroCeleb?.short_desc_en ?? heroCeleb?.short_desc) : heroCeleb?.short_desc) && (
                  <p className="text-base text-white/90 font-sans leading-relaxed">{locale === "en" ? (heroCeleb.short_desc_en ?? heroCeleb.short_desc) : heroCeleb.short_desc}</p>
                )}

                {(locale === "en" ? (heroCeleb?.long_desc_en ?? heroCeleb?.long_desc) : heroCeleb?.long_desc) && (
                  <p className="text-sm text-text-secondary font-sans leading-relaxed break-keep line-clamp-3">{locale === "en" ? (heroCeleb.long_desc_en ?? heroCeleb.long_desc) : heroCeleb.long_desc}</p>
                )}
              </div>
            </div>

            {/* 넘버 뱃지 */}
            <div className="absolute top-4 right-4 z-30">
              <div className="w-12 h-12 rounded-full border border-white/10 bg-black/50 backdrop-blur-md flex items-center justify-center flex-col gap-0.5">
                <span className="text-[8px] font-cinzel uppercase text-white/70">{t("number")}</span>
                <span className="text-base font-serif font-bold text-white">{selectedIndex + 1}</span>
              </div>
            </div>

            {/* 스와이프 인디케이터 - 하단 중앙 */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-30">
              {celebs.map((_, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "w-2 h-2 rounded-full transition-all duration-200",
                    idx === selectedIndex ? "bg-accent w-4" : "bg-white/30"
                  )}
                />
              ))}
            </div>
          </div>

          {/* 인물 배열 썸네일 */}
          {celebThumbnails}
        </div>

        {detailModal}
      </div>
    );
  }
  // #endregion

  // #region main 기본 레이아웃 (수직 배치)
  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto">

      {/* Hero Card - 텍스트 중심, 좌우 드래그 시 인물 전환 */}
      <div
        className={cn(
          "group relative w-full overflow-hidden rounded-[4px] bg-[#0a0a0a] shadow-2xl select-none transition-all duration-300",
          isHeroDragging ? "cursor-grabbing" : "cursor-grab",
          isTransitioning ? "opacity-0 scale-[0.98]" : "opacity-100 scale-100"
        )}
        onMouseDown={(e) => handleHeroDragStart(e.clientX, e.clientY)}
        onMouseMove={(e) => handleHeroDragMove(e.clientX, e.clientY)}
        onMouseUp={handleHeroDragEnd}
        onMouseLeave={handleHeroDragEnd}
        onClick={() => !heroHasDragged.current && heroCeleb && (() => { setModalCeleb(heroCeleb); setModalCelebIndex(selectedIndex); })()}
      >
        <div className="absolute inset-0 opacity-[0.03] bg-[url('/images/stardust.png')]" />

        <div
          key={selectedIndex}
          className={cn(
            "relative flex items-center gap-6 md:gap-8 p-6 md:p-10",
            slideDirection === "left" && "animate-slide-in-right",
            slideDirection === "right" && "animate-slide-in-left"
          )}
          style={{
            transform: isHeroDragging ? `translateX(${dragOffset * 0.3}px)` : undefined,
            opacity: isHeroDragging ? 1 - Math.abs(dragOffset) * 0.002 : 1,
          }}
        >
            {/* 원형 아바타 */}
            <div className="flex-shrink-0 w-20 h-20 md:w-24 md:h-24 rounded-full overflow-hidden ring-2 ring-accent/30 ring-offset-2 ring-offset-[#0a0a0a]">
              {heroCeleb?.avatar_url ? (
                <Image
                  src={heroCeleb.avatar_url}
                  alt={heroCeleb?.nickname ?? ""}
                  width={96}
                  height={96}
                  priority={selectedIndex === 0}
                  className="object-cover w-full h-full"
                />
              ) : (
                <div className="w-full h-full bg-neutral-800 flex items-center justify-center">
                  <span className="text-3xl text-white/20 font-serif font-black">{heroCeleb?.nickname?.[0]}</span>
                </div>
              )}
            </div>

            {/* 텍스트 영역 */}
            <div className="flex-1 flex flex-col gap-3 min-w-0 max-w-xl">
                  <div className="flex flex-col gap-1">
                    {heroCeleb?.title && (
                      <span className="text-xs md:text-sm text-accent font-serif font-bold tracking-wider leading-snug">
                        {heroCeleb.title}
                      </span>
                    )}
                    <h3 className="text-lg md:text-2xl font-serif font-black text-white leading-tight tracking-tight">
                      {heroCeleb?.nickname}
                    </h3>
                  </div>

                  {(locale === "en" ? (heroCeleb?.short_desc_en ?? heroCeleb?.short_desc) : heroCeleb?.short_desc) && (
                    <p className="text-base md:text-lg text-white font-sans font-medium leading-relaxed text-balance opacity-90">
                      {locale === "en" ? (heroCeleb.short_desc_en ?? heroCeleb.short_desc) : heroCeleb.short_desc}
                    </p>
                  )}

                  {(locale === "en" ? (heroCeleb?.long_desc_en ?? heroCeleb?.long_desc) : heroCeleb?.long_desc) && (
                    <p className="text-sm md:text-[15px] text-text-secondary font-sans leading-relaxed break-keep opacity-80 line-clamp-4">
                      {locale === "en" ? (heroCeleb.long_desc_en ?? heroCeleb.long_desc) : heroCeleb.long_desc}
                    </p>
                  )}
            </div>
        </div>

        {/* 넘버 뱃지 - 우상단 */}
        <div className="absolute top-3 right-3 z-30">
          <div className="w-11 h-11 md:w-14 md:h-14 rounded-full border border-white/10 bg-black/50 backdrop-blur-md flex items-center justify-center flex-col gap-0">
             <span className="text-[7px] md:text-[9px] font-cinzel uppercase text-white/70">{t("number")}</span>
             <span className="text-sm md:text-lg font-serif font-bold text-white">{selectedIndex + 1}</span>
          </div>
        </div>

        {/* 스와이프 인디케이터 - 하단 중앙 */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-30">
          {celebs.map((_, idx) => {
            const isNext = (dragOffset < -SWIPE_THRESHOLD && idx === selectedIndex + 1);
            const isPrev = (dragOffset > SWIPE_THRESHOLD && idx === selectedIndex - 1);
            return (
              <div
                key={idx}
                className={cn(
                  "w-2 h-2 rounded-full transition-all duration-200",
                  idx === selectedIndex ? "bg-accent w-4" : "bg-white/30",
                  (isNext || isPrev) && "bg-accent/70 scale-125"
                )}
              />
            );
          })}
        </div>

      </div>

      {/* Grid Content - 썸네일 리스트 */}
      {celebThumbnails}

      {detailModal}
    </div>
  );
}
