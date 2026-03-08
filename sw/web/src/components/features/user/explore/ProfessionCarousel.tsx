"use client";

import { useRef, useState, useCallback } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import CelebCard from "@/components/shared/CelebCard";
import type { CelebProfile } from "@/types/home";
import type { DialogueSubtitleData } from "@/components/features/game/shared/hooks/useDialogue";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useProfessionLabel } from "@/hooks/useFilterLabels";

interface ProfessionCarouselProps {
  profession: string;
  label: string;
  celebs: CelebProfile[];
  totalCount: number;
  onSubtitle?: (sub: DialogueSubtitleData) => void;
}

export default function ProfessionCarousel({
  profession,
  label,
  celebs,
  totalCount,
  onSubtitle,
}: ProfessionCarouselProps) {
  const t = useTranslations("explore.ui");
  const getProfLabel = useProfessionLabel();
  const containerRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);

  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = containerRef.current;
    setShowLeftArrow(scrollLeft > 0);
    setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10);
  }, []);

  const scroll = useCallback((direction: "left" | "right") => {
    if (!containerRef.current) return;
    const { clientWidth } = containerRef.current;
    const scrollAmount = direction === "left" ? -clientWidth * 0.7 : clientWidth * 0.7;
    containerRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
  }, []);

  if (celebs.length === 0) return null;

  return (
    <section className="relative">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <h3 className="text-sm md:text-base font-bold text-white tracking-tight">
            {getProfLabel(label)}
          </h3>
          <span className="text-xs text-white/40 font-medium">{totalCount}</span>
        </div>
      </div>

      {/* Carousel */}
      <div className="relative group/slider">
        {/* Left Arrow (Desktop) */}
        <button
          onClick={() => scroll("left")}
          className={`hidden md:flex absolute -left-4 top-[calc(50%-20px)] -translate-y-1/2 z-20 w-10 h-10 items-center justify-center rounded-full bg-black/60 backdrop-blur-sm border border-white/10 text-white hover:bg-accent hover:text-black transition-all duration-300 ${
            !showLeftArrow
              ? "opacity-0 pointer-events-none"
              : "opacity-0 group-hover/slider:opacity-100"
          }`}
          aria-label={t("prev")}
        >
          <ArrowLeft size={16} />
        </button>

        {/* Right Arrow (Desktop) */}
        <button
          onClick={() => scroll("right")}
          className={`hidden md:flex absolute -right-4 top-[calc(50%-20px)] -translate-y-1/2 z-20 w-10 h-10 items-center justify-center rounded-full bg-black/60 backdrop-blur-sm border border-white/10 text-white hover:bg-accent hover:text-black transition-all duration-300 ${
            !showRightArrow
              ? "opacity-0 pointer-events-none"
              : "opacity-0 group-hover/slider:opacity-100"
          }`}
          aria-label={t("next")}
        >
          <ArrowRight size={16} />
        </button>

        {/* Scroll Container */}
        <div
          ref={containerRef}
          onScroll={handleScroll}
          className="flex overflow-x-auto pb-2 scrollbar-hidden snap-x snap-mandatory gap-2 md:gap-3"
        >
          {celebs.map((celeb) => (
            <div
              key={celeb.id}
              className="flex-shrink-0 w-[28%] sm:w-[22%] md:w-[16%] lg:w-[13%] xl:w-[11%] 2xl:w-[9%] snap-start"
            >
              <CelebCard
                id={celeb.id}
                nickname={celeb.nickname}
                avatar_url={celeb.avatar_url}
                title={celeb.title}
                count={celeb.content_count}
                celebProfile={celeb}
                variant="card"
                shape="square"
                onSubtitle={onSubtitle}
              />
            </div>
          ))}
          {/* View All Card */}
          {totalCount > celebs.length && (
            <Link
              href={`/explore/figures?profession=${profession}`}
              className="flex-shrink-0 w-[28%] sm:w-[22%] md:w-[16%] lg:w-[13%] xl:w-[11%] 2xl:w-[9%] snap-start"
            >
              <div className="aspect-[13/19] rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] hover:border-accent/30 transition-all duration-300 flex flex-col items-center justify-center gap-2 cursor-pointer">
                <span className="text-2xl md:text-3xl font-bold text-accent/80">+{totalCount - celebs.length}</span>
                <span className="text-[10px] md:text-xs text-white/50 font-medium">{t("viewMore")}</span>
              </div>
            </Link>
          )}
          {/* End Spacer */}
          <div className="w-2 flex-shrink-0" />
        </div>
      </div>
    </section>
  );
}
