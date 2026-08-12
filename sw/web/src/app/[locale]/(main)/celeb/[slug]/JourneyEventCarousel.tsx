"use client";

import {
  useCallback,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { useTranslations } from "next-intl";
import { ArrowLeft, ArrowRight } from "lucide-react";

import type { CelebTimelineEvent } from "@/actions/celebs/getCelebTimelineEvents";
import JourneyEventCard from "./JourneyEventCard";
import { formatTimelinePosition } from "./journeyTimeline";

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
  const [dragX, setDragX] = useState(0);
  const swipeRef = useRef({
    x: 0,
    y: 0,
    active: false,
    moved: false,
    offset: 0,
  });
  const trackRef = useRef<HTMLDivElement>(null);
  const total = events.length;

  const go = useCallback(
    (next: number) => {
      onChange(Math.max(0, Math.min(total - 1, next)));
    },
    [onChange, total],
  );

  const handleDragStart = useCallback((event: ReactPointerEvent) => {
    swipeRef.current = {
      x: event.clientX,
      y: event.clientY,
      active: true,
      moved: false,
      offset: 0,
    };
  }, []);

  const handleDragMove = useCallback(
    (event: ReactPointerEvent) => {
      const drag = swipeRef.current;
      if (!drag.active) return;
      const dx = event.clientX - drag.x;
      const dy = event.clientY - drag.y;

      if (!drag.moved) {
        if (Math.abs(dx) < 6) return;
        if (Math.abs(dx) <= Math.abs(dy)) {
          drag.active = false;
          return;
        }
        drag.moved = true;
      }

      const atEdge =
        (current === 0 && dx > 0) ||
        (current === total - 1 && dx < 0);
      drag.offset = atEdge ? dx * 0.3 : dx;
      setDragX(drag.offset);
    },
    [current, total],
  );

  const handleDragEnd = useCallback(() => {
    const drag = swipeRef.current;
    const shifted = drag.offset;
    drag.active = false;
    drag.offset = 0;
    setDragX(0);
    if (!shifted) return;

    const width = trackRef.current?.clientWidth ?? 0;
    const threshold = width ? Math.min(SWIPE_MIN, width * 0.2) : SWIPE_MIN;
    if (Math.abs(shifted) >= threshold) {
      go(shifted < 0 ? current + 1 : current - 1);
    }
  }, [current, go]);

  return (
    <div
      data-timeline-carousel
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
        <div
          className={`flex h-full items-stretch ${
            dragX ? "" : "transition-transform duration-300 ease-out"
          }`}
          style={{
            transform: `translateX(calc(${-current * 100}% + ${dragX}px))`,
          }}
        >
          {events.map((item, itemIndex) => {
            const isCurrent = itemIndex === current;

            return (
              <JourneyEventCard
                key={item.id}
                event={item}
                isCurrent={isCurrent}
                positionLabel={formatTimelinePosition(item, t("timelineBc"))}
                pageLabel={t("timelinePage", {
                  current: itemIndex + 1,
                  total,
                })}
                onPlaceSelect={() => {
                  if (!swipeRef.current.moved) onPlaceSelect(item.id);
                }}
              />
            );
          })}
        </div>
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
