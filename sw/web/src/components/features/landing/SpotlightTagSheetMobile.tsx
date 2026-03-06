"use client";

import { useState, useEffect } from "react";
import { ChevronDown, Lock, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FeaturedTag } from "@/actions/home";
import { useTranslations } from "next-intl";

interface SpotlightTagSheetMobileProps {
  tags: FeaturedTag[];
  activeIndex: number;
  onChange: (idx: number) => void;
  locale: 'ko' | 'en';
}

export default function SpotlightTagSheetMobile({
  tags,
  activeIndex,
  onChange,
  locale,
}: SpotlightTagSheetMobileProps) {
  const t = useTranslations("landing");
  const [isOpen, setIsOpen] = useState(false);
  const activeTag = tags[activeIndex];

  // Prevent body scroll when sheet is open
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

  // When selection changes, close the sheet
  useEffect(() => {
    setIsOpen(false);
  }, [activeIndex]);

  const activeTagName = locale === 'en' ? (activeTag?.name_en ?? activeTag?.name) : activeTag?.name;

  return (
    <div className="w-full relative px-4 pb-4 border-b border-white/5 mb-4">
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-white/5 border border-white/10 active:bg-white/10 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-accent font-cinzel uppercase tracking-widest mt-0.5">
            Theme
          </span>
          <span className="text-[15px] font-sans font-bold text-white">
            {activeTagName}
          </span>
        </div>
        <ChevronDown size={18} className="text-text-tertiary" />
      </button>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm transition-opacity duration-300"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Bottom Sheet */}
      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-[101] bg-[#111111] rounded-t-3xl border-t border-white/10 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] transition-transform duration-300 ease-out flex flex-col max-h-[85vh]",
          isOpen ? "translate-y-0" : "translate-y-full"
        )}
      >
        {/* Handle Bar */}
        <div className="w-full flex justify-center pt-3 pb-1" onClick={() => setIsOpen(false)}>
          <div className="w-12 h-1.5 rounded-full bg-white/20" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <h3 className="text-[17px] font-sans font-bold text-white tracking-wide">
            {t("selectTheme") || "Select Theme"}
          </h3>
          <button onClick={() => setIsOpen(false)} className="p-2 -mr-2 text-text-tertiary hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Scrollable List */}
        <div className="overflow-y-auto px-4 py-4 pb-10 overscroll-contain flex flex-col gap-2">
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
                  "flex items-center justify-between w-full px-4 py-3.5 rounded-2xl transition-all duration-200 text-left",
                  isActive
                    ? "bg-accent/10 border border-accent/30 shadow-inner"
                    : isUpcoming
                      ? "bg-black/20 opacity-40 cursor-not-allowed border border-transparent"
                      : "bg-white/5 border border-white/5 active:bg-white/10"
                )}
              >
                <div className="flex items-center gap-3">
                  {isActive && <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />}
                  <span
                    className={cn(
                      "font-sans font-semibold text-[15px] tracking-wide",
                      isActive ? "text-accent" : "text-white/90"
                    )}
                  >
                    {tagName}
                  </span>
                </div>
                
                {isUpcoming && (
                  <div className="flex items-center gap-1.5 text-text-tertiary">
                    <span className="text-[10px] uppercase font-sans tracking-wider font-semibold">Soon</span>
                    <Lock size={12} />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
