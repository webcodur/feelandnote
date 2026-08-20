"use client";

import { useCallback, useRef, type PointerEvent as ReactPointerEvent } from "react";
import { useTranslations } from "next-intl";
import { ArrowLeft, ArrowRight } from "lucide-react";

import type { CelebTimelineEvent } from "@/actions/celebs/getCelebTimelineEvents";
import JourneyEventCard from "./JourneyEventCard";
import { formatTimelineHeadline, timelineYearCopy } from "./journeyTimeline";

interface Props {
  events: CelebTimelineEvent[];
  current: number;
  onChange: (next: number) => void;
  onPlaceSelect: (id: string) => void;
}

const SWIPE_MIN = 40;

export default function JourneyEventCarousel({
  events,
  current,
  onChange,
  onPlaceSelect,
}: Props) {
  const t = useTranslations("celebPage");
  const yearCopy = timelineYearCopy(t);
  const swipeRef = useRef({
    x: 0,
    y: 0,
    active: false,
    moved: false,
    offset: 0,
  });
  const trackRef = useRef<HTMLDivElement>(null);
  const total = events.length;
  const event = events[current];

  const go = useCallback(
    (next: number) => {
      onChange(Math.max(0, Math.min(total - 1, next)));
    },
    [onChange, total],
  );

  const handleDragStart = useCallback((pointer: ReactPointerEvent) => {
    swipeRef.current = {
      x: pointer.clientX,
      y: pointer.clientY,
      active: pointer.pointerType === "touch",
      moved: false,
      offset: 0,
    };
  }, []);

  const handleDragMove = useCallback((pointer: ReactPointerEvent) => {
    const drag = swipeRef.current;
    if (!drag.active) return;
    const dx = pointer.clientX - drag.x;
    const dy = pointer.clientY - drag.y;

    if (!drag.moved) {
      if (Math.abs(dx) < 6) return;
      if (Math.abs(dx) <= Math.abs(dy)) {
        drag.active = false;
        return;
      }
      drag.moved = true;
    }

    drag.offset = dx;
  }, []);

  const handleDragEnd = useCallback(() => {
    const drag = swipeRef.current;
    const shifted = drag.offset;
    drag.active = false;
    drag.offset = 0;
    if (!shifted) return;

    const width = trackRef.current?.clientWidth ?? 0;
    const threshold = width ? Math.min(SWIPE_MIN, width * 0.2) : SWIPE_MIN;
    if (Math.abs(shifted) >= threshold) {
      go(shifted < 0 ? current + 1 : current - 1);
    }
  }, [current, go]);

  if (!event) return null;

  return (
    <div
      data-timeline-carousel
      data-timeline-index={current}
      data-timeline-total={total}
      className="grid h-[360px] min-w-0 grid-cols-[40px_minmax(0,1fr)_40px] overflow-hidden rounded border border-accent-dim/30 bg-bg-secondary/35 md:h-[396px] md:grid-cols-[52px_minmax(0,1fr)_52px]"
    >
      <button
        data-timeline-rail="previous"
        type="button"
        onClick={() => go(current - 1)}
        disabled={current === 0}
        aria-label={t("timelinePrev")}
        className="flex h-full items-center justify-center border-e border-accent-dim/25 bg-bg-secondary/45 text-text-secondary hover:bg-accent/10 hover:text-accent focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent disabled:pointer-events-none disabled:opacity-20"
      >
        <ArrowLeft size={21} strokeWidth={1.6} aria-hidden />
      </button>

      <div
        ref={trackRef}
        className="h-full min-w-0 overflow-hidden touch-pan-y"
        onPointerDown={handleDragStart}
        onPointerMove={handleDragMove}
        onPointerUp={handleDragEnd}
        onPointerCancel={handleDragEnd}
        onPointerLeave={handleDragEnd}
      >
        <JourneyEventCard
          event={event}
          isCurrent
          positionLabel={formatTimelineHeadline(
            event,
            yearCopy,
            (when, place) => t("timelineHeadlineJoin", { when, place }),
          )}
          currentNumber={current + 1}
          currentLabel={t("timelineCurrent", { current: current + 1 })}
          totalLabel={t("timelineTotal", { total })}
          onPlaceSelect={() => {
            if (!swipeRef.current.moved) onPlaceSelect(event.id);
          }}
        />
      </div>

      <button
        data-timeline-rail="next"
        data-timeline-next
        type="button"
        onClick={() => go(current + 1)}
        disabled={current >= total - 1}
        aria-label={t("timelineNext")}
        className="flex h-full items-center justify-center border-s border-accent-dim/25 bg-bg-secondary/45 text-text-secondary hover:bg-accent/10 hover:text-accent focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent disabled:pointer-events-none disabled:opacity-20"
      >
        <ArrowRight size={21} strokeWidth={1.6} aria-hidden />
      </button>
    </div>
  );
}
