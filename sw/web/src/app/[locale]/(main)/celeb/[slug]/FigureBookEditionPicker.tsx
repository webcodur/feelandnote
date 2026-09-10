"use client";

import { useEffect, useRef, useState } from "react";
import { BookOpenText } from "lucide-react";
import { useTranslations } from "next-intl";
import type { FigureBookContent } from "@/actions/figure-books/getFigureBooks";
import AnimatedHeight from "@/components/ui/AnimatedHeight";
import ContentImage from "@/components/ui/ContentImage";

interface FigureBookEditionPickerProps {
  source: FigureBookContent;
  selectedEditionId: number;
  onSelect: (editionId: number) => void;
}

const PANEL_DURATION = 320;
const CONTENT_DURATION = 180;

export default function FigureBookEditionPicker({
  source,
  selectedEditionId,
  onSelect,
}: FigureBookEditionPickerProps) {
  const t = useTranslations("celebPage");
  const hasEditionPicker = source.editions.length > 1;
  const [panelMounted, setPanelMounted] = useState(hasEditionPicker);
  const [contentMounted, setContentMounted] = useState(hasEditionPicker);
  const [contentVisible, setContentVisible] = useState(hasEditionPicker);
  const previousHasEditionPicker = useRef(hasEditionPicker);

  useEffect(() => {
    const wasVisible = previousHasEditionPicker.current;
    previousHasEditionPicker.current = hasEditionPicker;
    if (wasVisible === hasEditionPicker) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timers: number[] = [];
    const schedule = (callback: () => void, delay: number) => {
      const timer = window.setTimeout(callback, delay);
      timers.push(timer);
    };

    if (hasEditionPicker) {
      schedule(() => {
        setPanelMounted(true);
        setContentMounted(true);
        setContentVisible(reduceMotion);
      }, 0);
      if (!reduceMotion) schedule(() => setContentVisible(true), PANEL_DURATION);
    } else {
      schedule(() => setContentVisible(false), 0);
      schedule(() => {
        setContentMounted(false);
        if (reduceMotion) {
          setPanelMounted(false);
        } else {
          schedule(() => setPanelMounted(false), PANEL_DURATION);
        }
      }, reduceMotion ? 0 : CONTENT_DURATION);
    }

    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [hasEditionPicker]);

  return (
    <AnimatedHeight
      independent
      duration={PANEL_DURATION}
      className={`overflow-hidden rounded-lg border border-accent-dim/50 bg-stone-heavy shadow-[0_8px_24px_rgba(0,0,0,0.22)] ${panelMounted ? "w-full" : "hidden"}`}
    >
      {contentMounted && (
        <section className="relative">
          <div
            className={`transition-opacity duration-[180ms] motion-reduce:transition-none ${contentVisible ? "opacity-100" : "pointer-events-none opacity-0"}`}
          >
            <header className="relative flex min-h-11 items-center justify-start gap-2.5 bg-bg-secondary/55 pe-3 ps-8 py-2 text-start before:absolute before:inset-y-2.5 before:start-3 before:w-0.5 before:rounded-full before:bg-accent/80 before:content-['']">
              <p className="shrink-0 text-[15px] font-black tracking-[0.12em] text-accent">
                {t("sourceEditionLabel")}<span className="ms-1 text-accent-dim" aria-hidden>:</span>
              </p>
              <p className="min-w-0 truncate text-[15px] font-medium leading-5 tracking-[0.01em] text-text-secondary">
                {t("sourceEditionIntro")}
              </p>
            </header>
            <div className="relative flex snap-x snap-proximity gap-2 overflow-x-auto overscroll-x-contain bg-stone-heavy bg-texture-noise px-2 py-2.5 pb-1 [overflow-anchor:none] [scrollbar-width:thin] sm:px-3 sm:py-3 md:px-4">
              {source.editions.map((option) => {
                const active = option.id === selectedEditionId;
                return (
                  <button
                    key={option.id}
                    type="button"
                    aria-pressed={active}
                    aria-label={t("sourceEditionSelectAria", { title: option.title })}
                    onClick={(event) => {
                      onSelect(option.id);
                      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
                      event.currentTarget.scrollIntoView({
                        behavior: reduceMotion ? "auto" : "smooth",
                        block: "nearest",
                        inline: "center",
                      });
                    }}
                    className={`grid h-[84px] shrink-0 snap-center grid-cols-[56px_minmax(0,1fr)] border p-0 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                      active
                        ? "border-accent bg-accent/10"
                        : "effect-engraved border-stone-light bg-stone-heavy hover:border-accent hover:bg-accent/[0.06]"
                    }`}
                  >
                    <div className="effect-bevel relative flex h-full w-14 items-center justify-center overflow-hidden border-e border-accent-dim/30 bg-bg-secondary">
                      {option.thumbnailUrl ? <ContentImage src={option.thumbnailUrl} alt="" sizes="48px" className="object-cover" /> : <BookOpenText className="text-accent" size={17} aria-hidden />}
                    </div>
                    <span className="grid min-w-0 grid-rows-2 px-3 py-2 text-center">
                      <span className={`flex min-w-0 items-center justify-center ${option.creator || source.creator ? "" : "row-span-2"}`}>
                        <span className="block truncate text-[15px] font-black leading-[1.25] tracking-[-0.01em] text-3d-gold">
                          {option.title}
                        </span>
                      </span>
                      {(option.creator || source.creator) && <span className="flex min-w-0 items-center justify-center"><span className="block truncate text-sm font-medium leading-5 tracking-[0.05em] text-text-secondary">{option.creator || source.creator}</span></span>}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      )}
    </AnimatedHeight>
  );
}
