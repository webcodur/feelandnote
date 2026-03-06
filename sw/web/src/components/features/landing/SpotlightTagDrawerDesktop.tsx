"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FeaturedTag } from "@/actions/home";
import { useTranslations } from "next-intl";

interface SpotlightTagDrawerDesktopProps {
  tags: FeaturedTag[];
  activeIndex: number;
  onChange: (idx: number) => void;
  isExplore: boolean;
  activeDescription: string;
  locale: 'ko' | 'en';
}

export default function SpotlightTagDrawerDesktop({
  tags,
  activeIndex,
  onChange,
  isExplore,
  activeDescription,
  locale,
}: SpotlightTagDrawerDesktopProps) {
  const t = useTranslations("landing");
  const [isOpen, setIsOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const activeTag = tags[activeIndex];

  // PC Grid: Prevent auto-closing when selecting a tag. 
  // Allow user to explore multiple tags while the drawer is open.

  return (
    <div className={cn("max-w-5xl mx-auto flex flex-col items-center", isExplore ? "px-0 pt-4" : "px-0")}>
      {/* Header / Active Tag Display */}
      <div className="w-full flex items-center justify-end border-b border-white/10 pb-3 mb-2">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 transition-all group"
        >
          <span className="text-sm font-medium text-text-primary group-hover:text-accent font-sans">
            {t("viewAllThemes") || "View All Themes"}
          </span>
          <ChevronDown
            size={16}
            className={cn("text-text-tertiary transition-transform duration-300", isOpen && "rotate-180")}
          />
        </button>
      </div>

      {/* Expandable Grid Drawer */}
      <div
        className={cn(
          "w-full overflow-hidden transition-all duration-500 ease-in-out",
        )}
        style={{
          maxHeight: isOpen ? (contentRef.current?.scrollHeight ? `${contentRef.current.scrollHeight}px` : "1000px") : "0px",
          opacity: isOpen ? 1 : 0,
        }}
      >
        <div ref={contentRef} className="pt-4 pb-6 px-2">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
            {tags.map((tag, idx) => {
              const isActive = activeIndex === idx;
              const isUpcoming = !tag.is_featured;
              const tagName = locale === 'en' ? (tag.name_en ?? tag.name) : tag.name;

              return (
                <button
                  key={tag.id}
                  onClick={() => !isUpcoming && onChange(idx)}
                  disabled={isUpcoming}
                  className={cn(
                    "relative flex flex-col items-start gap-0.5 p-2.5 rounded-xl border transition-all duration-300 text-left overflow-hidden group",
                    isActive
                      ? "bg-accent/10 border-accent/50 shadow-[0_0_15px_rgba(255,184,0,0.15)] ring-1 ring-accent/30"
                      : isUpcoming
                        ? "bg-black/20 border-white/5 opacity-50 cursor-not-allowed"
                        : "bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/10"
                  )}
                >
                  <div className="flex items-center justify-between w-full">
                    <span
                      className={cn(
                        "font-sans font-bold tracking-wide text-[13px] truncate pr-1 text-balance",
                        isActive ? "text-accent" : "text-white/90"
                      )}
                    >
                      {tagName}
                    </span>
                    {isUpcoming && <Lock size={12} className="text-text-tertiary/60 flex-shrink-0" />}
                  </div>
                  
                  {isUpcoming && (
                    <span className="text-[10px] text-text-tertiary/70 font-sans mt-0.5">
                       {t("comingSoon") || "Coming Soon"}
                    </span>
                  )}
                  {/* Hover tooltip for upcoming items */}
                  {isUpcoming && (
                     <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity backdrop-blur-sm z-10">
                        <span className="text-[11px] text-white/90 font-medium px-2 py-1 bg-black/80 rounded border border-white/10">
                           {t("contentInPreparation") || "기대해주세요"}
                        </span>
                     </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
