/* ─────────────────────────────────────────────
 * [celeb 상세] timeline — 연표 넘김(스와이프)
 * - 목차 위치: timeline
 * - 데이터: events/current props
 * - 함께 보기: JourneyEventCard.tsx, JourneySection.tsx, journeyTimeline.ts
 * ───────────────────────────────────────────── */
"use client";

import { useCallback, useRef, type PointerEvent as ReactPointerEvent } from "react";
import { useTranslations } from "next-intl";

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
    if (
      pointer.target instanceof Element &&
      pointer.target.closest("[data-timeline-range-scroll]")
    ) {
      swipeRef.current.active = false;
      return;
    }

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
      className="h-[360px] min-w-0 overflow-hidden rounded border border-accent-dim/30 bg-bg-secondary/35 md:h-[396px]"
    >
      <div
        ref={trackRef}
        className="h-full min-w-0 overflow-hidden"
        onPointerDown={handleDragStart}
        onPointerMove={handleDragMove}
        onPointerUp={handleDragEnd}
        onPointerCancel={handleDragEnd}
        onPointerLeave={handleDragEnd}
      >
        <JourneyEventCard
          event={event}
          isCurrent
          events={events}
          positionLabel={formatTimelineHeadline(
            event,
            yearCopy,
            (when, place) => t("timelineHeadlineJoin", { when, place }),
          )}
          currentNumber={current + 1}
          currentLabel={t("timelineCurrent", { current: current + 1 })}
          pageLabel={t("timelinePage", { current: current + 1, total })}
          activityRangeLabel={t("timelineViewMap")}
          unknownPlaceLabel={t("timelineUnknownPlace")}
          previousLabel={t("timelinePrev")}
          nextLabel={t("timelineNext")}
          previousDisabled={current === 0}
          nextDisabled={current >= total - 1}
          onPrevious={() => go(current - 1)}
          onNext={() => go(current + 1)}
          onChange={go}
          onPlaceSelect={() => {
            if (!swipeRef.current.moved) onPlaceSelect(event.id);
          }}
        />
      </div>
    </div>
  );
}
