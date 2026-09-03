/* ─────────────────────────────────────────────
 * [celeb 상세] timeline — 행적 구간 레일(모바일)
 * - 목차 위치: timeline
 * - 데이터: events/current props
 * - 함께 보기: JourneyEventCard.tsx, JourneySection.tsx
 * ───────────────────────────────────────────── */
"use client";

import { Fragment, useEffect, useRef } from "react";
import { MapPin } from "lucide-react";

import type { CelebTimelineEvent } from "@/actions/celebs/getCelebTimelineEvents";

interface Props {
  events: CelebTimelineEvent[];
  current: number;
  label: string;
  countLabel: string;
  onChange: (next: number) => void;
}

interface RangeStop {
  event: CelebTimelineEvent;
  indexes: number[];
  label: string;
  unknown: boolean;
}

export default function JourneyActivityRange({
  events,
  current,
  label,
  countLabel,
  onChange,
}: Props) {
  const railRef = useRef<HTMLDivElement>(null);
  const rangeStops: RangeStop[] = [];
  events.forEach((event, index) => {
    const label = event.placeName ?? "?";
    const unknown = event.placeName == null;
    const previous = rangeStops.at(-1);
    if (previous?.label === label && previous.unknown === unknown) {
      previous.indexes.push(index);
      return;
    }
    rangeStops.push({ event, indexes: [index], label, unknown });
  });
  const activeStopIndex = rangeStops.findIndex(({ indexes }) =>
    indexes.includes(current),
  );

  useEffect(() => {
    const rail = railRef.current;
    const active = rail?.querySelector<HTMLElement>('[aria-current="step"]');
    if (!rail || !active) return;

    const left = active.offsetLeft - (rail.clientWidth - active.clientWidth) / 2;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    rail.scrollTo({ left, behavior: reduceMotion ? "auto" : "smooth" });
  }, [activeStopIndex]);

  if (rangeStops.length === 0) return null;

  return (
    <section
      data-timeline-mobile-range
      aria-label={label}
      className="border-b border-accent-dim/20 px-4 py-3 md:hidden"
    >
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="flex min-w-0 items-center gap-1.5 font-semibold text-text-primary">
          <MapPin size={15} className="shrink-0 text-accent" aria-hidden />
          {label}
        </span>
        <span
          data-timeline-range-count
          className="shrink-0 font-mono text-text-tertiary"
        >
          {countLabel}
        </span>
      </div>

      <div
        ref={railRef}
        data-timeline-range-scroll
        className="scrollbar-hide mt-2 flex items-center overflow-x-auto overscroll-x-contain pb-1.5 touch-pan-x [overflow-anchor:none]"
      >
        {rangeStops.map(({ event, indexes, label, unknown }, routeIndex) => {
          const active = routeIndex === activeStopIndex;
          return (
            <Fragment key={event.id}>
              {routeIndex > 0 && (
                <span
                  aria-hidden
                  className="h-px w-4 shrink-0 bg-accent-dim/40"
                />
              )}
              <button
                type="button"
                data-timeline-range-event={indexes[0]}
                data-timeline-range-unknown={unknown ? "" : undefined}
                aria-current={active ? "step" : undefined}
                title={unknown ? event.title : label}
                onClick={() => onChange(active ? current : indexes[0])}
                className={`flex min-w-8 shrink-0 items-center justify-center gap-1.5 rounded-full border px-2.5 py-1 text-sm cursor-pointer hover:border-accent hover:bg-white/5 hover:text-accent ${
                  active
                    ? "border-accent bg-accent/10 font-semibold text-accent"
                    : unknown
                      ? "border-dashed border-accent-dim/30 text-text-tertiary"
                      : "border-accent-dim/30 text-text-secondary"
                }`}
              >
                <span>{label}</span>
                {indexes.length > 1 && (
                  <span className="font-mono text-text-tertiary">
                    {indexes.length}
                  </span>
                )}
              </button>
            </Fragment>
          );
        })}
      </div>
    </section>
  );
}
