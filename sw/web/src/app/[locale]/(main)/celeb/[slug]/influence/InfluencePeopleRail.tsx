"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useMouseDragScroll } from "@/hooks/useMouseDragScroll";

interface Props {
  children: ReactNode;
  initialIndex?: number;
  moreHref: string;
  moreLabel: string;
}

const ARROW_CLASS = "flex size-11 shrink-0 items-center justify-center rounded-control border border-line text-text-secondary enabled:hover:border-line-strong enabled:hover:bg-bg-raised enabled:hover:text-text-primary disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent";

export default function InfluencePeopleRail({ children, initialIndex = 0, moreHref, moreLabel }: Props) {
  const t = useTranslations("profilePage.influence.explorer");
  const { ref, cursorClassName, dragProps, stopGlide } = useMouseDragScroll();
  const [position, setPosition] = useState({ prev: false, next: false, start: 0, end: 0, total: 0 });
  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const cards = Array.from(el.firstElementChild?.children ?? []) as HTMLElement[];
    const edge = el.getBoundingClientRect();
    const visible = cards.map((card, index) => ({ box: card.getBoundingClientRect(), index }))
      .filter(({ box }) => box.right > edge.left + 1 && box.left < edge.right - 1);
    setPosition({ prev: el.scrollLeft > 1, next: el.scrollLeft < el.scrollWidth - el.clientWidth - 1, start: (visible[0]?.index ?? -1) + 1, end: (visible.at(-1)?.index ?? -1) + 1, total: cards.length });
  }, [ref]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const frame = requestAnimationFrame(() => {
      const card = el.firstElementChild?.children[initialIndex] as HTMLElement | undefined;
      if (card) el.scrollLeft = card.offsetLeft - (el.clientWidth - card.offsetWidth) / 2;
      measure();
    });
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); };
  }, [initialIndex, measure, ref]);

  const move = (direction: -1 | 1) => {
    const el = ref.current;
    if (!el) return;
    stopGlide();
    el.scrollBy({ left: direction * el.clientWidth * 0.8, behavior: "smooth" });
  };

  return (
    <div className="space-y-3">
      <div ref={ref} {...dragProps} onScroll={measure} className={`relative overflow-x-auto overscroll-x-contain scrollbar-hide select-none pointer-coarse:snap-x ${cursorClassName}`}>
        <ol className="flex items-stretch gap-2 py-1">{children}</ol>
      </div>
      <div className="flex items-center justify-between gap-3">
        <button type="button" aria-label={t("previousPeople")} disabled={!position.prev} onClick={() => move(-1)} className={ARROW_CLASS}><ChevronLeft size={18} aria-hidden /></button>
        <div className="text-center">
          <p aria-live="polite" className="text-xs tabular-nums text-text-tertiary">{position.start}–{position.end} / {position.total}</p>
          <Link href={moreHref} className="inline-flex min-h-11 items-center gap-1 rounded-control px-2 text-sm text-text-secondary hover:bg-bg-raised hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">{moreLabel}<ChevronRight size={14} aria-hidden /></Link>
        </div>
        <button type="button" aria-label={t("nextPeople")} disabled={!position.next} onClick={() => move(1)} className={ARROW_CLASS}><ChevronRight size={18} aria-hidden /></button>
      </div>
    </div>
  );
}
