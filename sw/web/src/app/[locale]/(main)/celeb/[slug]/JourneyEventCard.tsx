/* ─────────────────────────────────────────────
 * [celeb 상세] timeline — 연표 사건 카드
 * - 목차 위치: timeline
 * - 데이터: event/events/표시 문구 props
 * - 함께 보기: JourneyEventCarousel.tsx, JourneyActivityRange.tsx, TimelineIndexTick.tsx
 * ───────────────────────────────────────────── */
"use client";

import { useRef, type PointerEvent as ReactPointerEvent } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";

import type { CelebTimelineEvent } from "@/actions/celebs/getCelebTimelineEvents";

import JourneyActivityRange from "./JourneyActivityRange";
import TimelineIndexTick from "./TimelineIndexTick";

interface Props {
  event: CelebTimelineEvent;
  events: CelebTimelineEvent[];
  isCurrent: boolean;
  positionLabel: string;
  currentNumber: number;
  currentLabel: string;
  totalLabel: string;
  activityRangeLabel: string;
  activityRangeCountLabel: string;
  previousLabel: string;
  nextLabel: string;
  previousDisabled: boolean;
  nextDisabled: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onChange: (next: number) => void;
  onPlaceSelect: () => void;
}

export default function JourneyEventCard({
  event,
  events,
  isCurrent,
  positionLabel,
  currentNumber,
  currentLabel,
  totalLabel,
  activityRangeLabel,
  activityRangeCountLabel,
  previousLabel,
  nextLabel,
  previousDisabled,
  nextDisabled,
  onPrevious,
  onNext,
  onChange,
  onPlaceSelect,
}: Props) {
  const hasPlace = event.lat != null && event.lng != null;
  const titleDragRef = useRef({ pointerId: -1, x: 0, left: 0 });

  /* ── 1. 제목 드래그 처리 ── */
  const handleTitlePointerDown = (pointer: ReactPointerEvent<HTMLDivElement>) => {
    if (pointer.pointerType !== "mouse" || pointer.button !== 0) return;
    titleDragRef.current = {
      pointerId: pointer.pointerId,
      x: pointer.clientX,
      left: pointer.currentTarget.scrollLeft,
    };
    pointer.currentTarget.setPointerCapture(pointer.pointerId);
    pointer.preventDefault();
  };

  const handleTitlePointerMove = (pointer: ReactPointerEvent<HTMLDivElement>) => {
    const drag = titleDragRef.current;
    if (drag.pointerId !== pointer.pointerId) return;
    pointer.currentTarget.scrollLeft = drag.left - (pointer.clientX - drag.x);
    pointer.preventDefault();
  };

  const handleTitlePointerEnd = (pointer: ReactPointerEvent<HTMLDivElement>) => {
    if (titleDragRef.current.pointerId !== pointer.pointerId) return;
    if (pointer.currentTarget.hasPointerCapture(pointer.pointerId)) {
      pointer.currentTarget.releasePointerCapture(pointer.pointerId);
    }
    titleDragRef.current.pointerId = -1;
  };

  return (
    <article
      data-timeline-current={isCurrent ? "" : undefined}
      aria-hidden={!isCurrent}
      className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-bg-secondary/35"
    >
      {/* ── 2. 머리·제목 이동 ── */}
      <div className="grid h-12 shrink-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-accent-dim/20 px-4 md:px-5">
        <p
          className="flex size-7 items-center justify-center justify-self-start rounded-full border border-accent/70 bg-accent/10 font-mono text-xs font-black leading-none tabular-nums text-accent"
          aria-label={currentLabel}
        >
          <TimelineIndexTick value={currentNumber} />
        </p>
        {positionLabel ? (
          <>
            <p
              title={positionLabel}
              className={`min-w-0 truncate text-center font-mono text-sm font-semibold leading-none text-accent ${
                hasPlace ? "md:hidden" : ""
              }`}
            >
              {positionLabel}
            </p>
            {hasPlace && (
            <button
              type="button"
              tabIndex={isCurrent ? 0 : -1}
              onClick={onPlaceSelect}
              title={positionLabel}
              className="hidden min-w-0 truncate text-center font-mono text-sm font-semibold leading-none text-accent cursor-pointer hover:text-accent/80 md:block"
            >
              {positionLabel}
            </button>
            )}
          </>
        ) : (
          <span aria-hidden className="block" />
        )}
        <p className="justify-self-end font-mono text-sm leading-none text-text-tertiary">
          {totalLabel}
        </p>
      </div>

      {/* 넘김 단추는 제목 양옆에 둔다. 양 끝 레일은 허전함만 키웠다 */}
      <div className="flex shrink-0 items-center gap-1 border-b border-accent-dim/20 px-2 py-2 md:px-3">
        <button
          data-timeline-rail="previous"
          type="button"
          onClick={onPrevious}
          disabled={previousDisabled}
          aria-label={previousLabel}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/[0.04] text-text-primary cursor-pointer hover:border-accent hover:bg-accent/15 hover:text-accent focus-visible:outline-2 focus-visible:outline-accent disabled:cursor-default disabled:opacity-25"
        >
          <ArrowLeft size={16} aria-hidden />
        </button>

        <div
          key={event.id}
          data-timeline-title-scroll
          onPointerDown={handleTitlePointerDown}
          onPointerMove={handleTitlePointerMove}
          onPointerUp={handleTitlePointerEnd}
          onPointerCancel={handleTitlePointerEnd}
          className="scrollbar-hide min-w-0 flex-1 cursor-grab select-none overflow-x-auto overscroll-x-contain touch-pan-x hover:bg-white/5 active:cursor-grabbing [overflow-anchor:none]"
        >
          <h3 className="flex h-full w-max min-w-full items-center justify-center whitespace-nowrap px-2 text-center text-lg font-bold leading-snug text-text-primary md:text-xl">
            {event.title}
          </h3>
        </div>

        <button
          data-timeline-rail="next"
          data-timeline-next
          type="button"
          onClick={onNext}
          disabled={nextDisabled}
          aria-label={nextLabel}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/[0.04] text-text-primary cursor-pointer hover:border-accent hover:bg-accent/15 hover:text-accent focus-visible:outline-2 focus-visible:outline-accent disabled:cursor-default disabled:opacity-25"
        >
          <ArrowRight size={16} aria-hidden />
        </button>
      </div>

      {/* ── 3. 본문 ── */}
      <div
        data-timeline-body-scroll
        tabIndex={isCurrent ? 0 : -1}
        className="custom-scrollbar min-h-0 flex-1 touch-pan-y overflow-y-auto [overflow-anchor:none] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent"
      >
        <JourneyActivityRange
          events={events}
          current={currentNumber - 1}
          label={activityRangeLabel}
          countLabel={activityRangeCountLabel}
          onChange={onChange}
        />

        <div className="px-4 py-4 md:px-5 md:py-5">
          <p className="break-keep break-words text-[15px] leading-[1.8] text-text-secondary md:text-base">
            {event.description ?? "-"}
          </p>
        </div>
      </div>
    </article>
  );
}
