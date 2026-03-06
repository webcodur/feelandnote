"use client";

import { useState, useEffect } from "react";
import { ChevronDown, Lock, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FeaturedTag } from "@/actions/home";
import { useTranslations } from "next-intl";
import { PROFESSION_ICONS } from "@/constants/professionIcons";

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
  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <>
      {/* Floating Button Positioned at Top-Left */}
      <div className="absolute left-6 top-2 md:left-10 md:top-3 z-[60]">
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 transition-all group backdrop-blur-md shadow-lg"
        >
          <span className="text-sm font-medium text-text-primary group-hover:text-accent font-sans drop-shadow-sm">
            {t("viewAllThemes") || "View All Themes"}
          </span>
          <ChevronDown
            size={16}
            className={cn("text-text-tertiary transition-transform duration-300", isOpen && "rotate-180")}
          />
        </button>
      </div>

      {/* Full-screen Modal Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 md:p-12 animate-in fade-in duration-300">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
            onClick={() => setIsOpen(false)}
          />

          {/* Modal Content */}
          <div className="relative w-full max-w-5xl max-h-[85vh] flex flex-col bg-[#111] border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/10 bg-white/5">
              <h3 className="text-lg md:text-xl font-serif font-bold text-white tracking-wide">
                {t("selectTheme") || "Select Theme"}
              </h3>
              <button 
                onClick={() => setIsOpen(false)} 
                className="p-1.5 text-text-tertiary hover:text-white hover:bg-white/10 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Scrollable Grid */}
            <div className="overflow-y-auto p-5 md:p-6 hide-scrollbar">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {tags.map((tag, idx) => {
                  const isActive = activeIndex === idx;
                  const isUpcoming = !tag.is_featured;
                  const tagName = locale === 'en' ? (tag.name_en ?? tag.name) : tag.name;
                  const celebCount = tag.celebs?.length ?? 0;
                  const professions = !isUpcoming
                    ? [...new Set(tag.celebs?.map(c => c.profession).filter((p): p is string => Boolean(p)) ?? [])]
                    : [];
                  return (
                    <button
                      key={tag.id}
                      onClick={() => {
                        if (!isUpcoming) {
                          onChange(idx);
                          setIsOpen(false);
                        }
                      }}
                      disabled={isUpcoming}
                      className={cn(
                        "relative flex flex-col items-start justify-between min-h-[92px] p-4 md:p-5 rounded-2xl border text-left overflow-hidden group",
                        isActive
                          ? "border-accent/50 bg-accent/5 shadow-[0_0_15px_rgba(255,184,0,0.15)] ring-1 ring-accent/30"
                          : isUpcoming
                            ? "bg-black/40 border-white/5 opacity-50 cursor-not-allowed"
                            : "border-white/10 hover:border-white/60 hover:shadow-lg"
                      )}
                      style={{
                        backgroundColor: isActive
                          ? undefined
                          : isUpcoming
                            ? undefined
                            : `${tag.color}0A`,
                      }}
                    >
                      {/* Immediate Background Hover Overlay */}
                      {!isUpcoming && !isActive && (
                        <div className="absolute inset-0 bg-transparent group-hover:bg-white/5 pointer-events-none z-0" />
                      )}

                      {/* Ambient Glow Effects (Delayed) */}
                      {!isUpcoming && !isActive && (
                        <div 
                          className="absolute -top-12 -right-12 w-40 h-40 rounded-[100%] blur-[45px] opacity-10 pointer-events-none transition-all duration-700 delay-150 group-hover:opacity-40 group-hover:scale-125 z-0"
                          style={{ backgroundColor: tag.color }}
                        />
                      )}

                      <div className="flex items-start justify-between w-full relative z-10 gap-2 mb-2">
                        <span
                          className={cn(
                            "font-sans font-bold tracking-wide text-[14.5px] leading-snug line-clamp-2",
                            isActive ? "text-accent" : "text-white/90 group-hover:text-white"
                          )}
                        >
                          {tagName}
                          {celebCount > 0 && (
                            <span className={cn(
                              "ml-1 font-normal text-[12px]",
                              isActive ? "text-accent/60" : "text-text-tertiary/70"
                            )}>
                              ({celebCount})
                            </span>
                          )}
                        </span>
                        {isUpcoming && <Lock size={13} className="text-text-tertiary/60 flex-shrink-0 mt-0.5" />}
                      </div>

                      <div className="flex items-end justify-between w-full relative z-10 mt-auto">
                        <div className="flex items-center gap-1.5 opacity-60 group-hover:opacity-100">
                          {professions.slice(0, 4).map((p) => {
                            const Icon = PROFESSION_ICONS[p as keyof typeof PROFESSION_ICONS];
                            if (!Icon) return null;
                            return <Icon key={p} size={15} className="text-white" />;
                          })}
                        </div>
                        {isUpcoming && (
                          <span className="text-[10px] uppercase font-sans tracking-wider font-semibold text-text-tertiary/70">
                            Soon
                          </span>
                        )}
                      </div>

                      {isUpcoming && (
                         <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity backdrop-blur-sm z-20">
                            <span className="text-[11px] text-white/90 font-medium px-3 py-1 bg-black/80 rounded border border-white/10">
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
      )}
    </>
  );
}
