"use client";

import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { FeaturedTag } from "@/actions/home";
import type { useCuratedSpotlight } from "./useCuratedSpotlight";

interface CelebThumbnailsProps {
  spotlight: ReturnType<typeof useCuratedSpotlight>;
  isExplore: boolean;
  activeTag: FeaturedTag;
}

export default function CelebThumbnails({ spotlight, isExplore, activeTag }: CelebThumbnailsProps) {
  const t = useTranslations("landing");
  const {
    celebs,
    selectedIndex,
    scrollContainerRef,
    dragRef,
    onListMouseDown,
    ripple,
    triggerRipple,
    clearRipple,
    fireGreeting,
    selectHero,
  } = spotlight;

  return (
    <div
      ref={scrollContainerRef}
      onMouseDown={onListMouseDown}
      className={cn(
        "flex overflow-x-auto scrollbar-hidden select-none cursor-grab touch-pan-x",
        isExplore ? "gap-4 py-3 px-1" : "gap-4 pb-4 px-4 pt-2"
      )}
    >
      {celebs.map((celeb, idx) => {
        const isSelected = idx === selectedIndex;
        return (
          <div
            key={celeb.id}
            onClick={(e) => {
              if (dragRef.current.hasMoved) { dragRef.current.hasMoved = false; return; }
              if (isSelected) {
                triggerRipple(celeb.id, e);
                fireGreeting(celeb);
              } else {
                selectHero(idx);
              }
              dragRef.current.hasMoved = false;
            }}
            className={cn(
              "flex-shrink-0 w-[80px] md:w-[100px] flex flex-col gap-1.5 cursor-pointer transition-all duration-300",
              isSelected
                ? "scale-[1.02]"
                : "opacity-60 hover:opacity-100 hover:-translate-y-1"
            )}
          >
            <div className={cn(
              "relative aspect-square rounded-lg overflow-hidden transition-[box-shadow] border border-transparent hover:border-accent/60",
              isSelected ? "ring-2 ring-accent ring-offset-2 ring-offset-bg-main shadow-lg" : ""
            )}>
              {celeb.avatar_url ? (
                <Image src={celeb.avatar_url} alt={celeb.nickname} fill sizes="150px" className="object-cover" />
              ) : (
                <div className="w-full h-full bg-bg-card flex items-center justify-center text-text-tertiary">
                  <span className="font-serif text-xl">{celeb.nickname[0]}</span>
                </div>
              )}
              {/* 클릭 ripple */}
              {ripple && ripple.id === celeb.id && (
                <span
                  key={ripple.key}
                  className="absolute rounded-full bg-accent/40 pointer-events-none animate-[ripple_400ms_ease-out_forwards]"
                  style={{ left: `${ripple.x}%`, top: `${ripple.y}%`, translate: "-50% -50%" }}
                  onAnimationEnd={clearRipple}
                />
              )}
            </div>
            <div className="flex flex-col items-center">
              {celeb.title && (
                <span className={cn(
                  "text-[9px] font-cinzel font-bold tracking-widest uppercase leading-tight truncate w-full text-center",
                  isSelected ? "text-amber-500" : "text-amber-500/60"
                )}>
                  {celeb.title}
                </span>
              )}
              <span className={cn(
                "text-[11px] font-sans font-bold tracking-wide truncate w-full text-center transition-colors",
                isSelected ? "text-white" : "text-text-secondary"
              )}>
                {celeb.nickname}
              </span>
            </div>
          </div>
        );
      })}
      {!isExplore && (
        <Link
          href={`/explore?tagId=${activeTag.id}`}
          className="flex-shrink-0 w-[80px] md:w-[100px] aspect-square flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-white/10 hover:border-accent hover:bg-accent/5 transition-all group"
        >
          <div className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center group-hover:border-accent group-hover:text-accent">
            <ArrowRight size={14} />
          </div>
          <span className="text-xs text-text-tertiary group-hover:text-accent font-sans">{t("viewAll")}</span>
        </Link>
      )}
    </div>
  );
}
