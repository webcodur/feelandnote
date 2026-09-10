/* ─────────────────────────────────────────────
 * [celeb 상세] timeline — 연표 사건 카드
 * - 목차 위치: timeline
 * - 데이터: event/events/표시 문구 props
 * - 함께 보기: JourneyEventCarousel.tsx, JourneyActivityRange.tsx, TimelineIndexTick.tsx
 * ───────────────────────────────────────────── */
"use client";

import { ArrowLeft, ArrowRight, Maximize2 } from "lucide-react";

import type { CelebTimelineEvent } from "@/actions/celebs/getCelebTimelineEvents";

import styles from "./CelebPageContent.module.css";
import JourneyActivityRange from "./JourneyActivityRange";
import TimelineIndexTick from "./TimelineIndexTick";

interface Props {
  event: CelebTimelineEvent;
  events: CelebTimelineEvent[];
  isCurrent: boolean;
  positionLabel: string;
  currentNumber: number;
  currentLabel: string;
  pageLabel: string;
  activityRangeLabel: string;
  unknownPlaceLabel: string;
  previousLabel: string;
  nextLabel: string;
  previousDisabled: boolean;
  nextDisabled: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onChange: (next: number) => void;
  onPlaceSelect: () => void;
  onExpand: () => void;
  expandLabel: string;
}

export default function JourneyEventCard({
  event,
  events,
  isCurrent,
  positionLabel,
  currentNumber,
  currentLabel,
  pageLabel,
  activityRangeLabel,
  unknownPlaceLabel,
  previousLabel,
  nextLabel,
  previousDisabled,
  nextDisabled,
  onPrevious,
  onNext,
  onChange,
  onPlaceSelect,
  onExpand,
  expandLabel,
}: Props) {
  const hasPlace = event.lat != null && event.lng != null;

  return (
    <article
      data-timeline-current={isCurrent ? "" : undefined}
      aria-hidden={!isCurrent}
      className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-bg-secondary/35"
    >
      {/* ── 2. 머리: 번호 + 연도·지명, 한 줄 ── */}
      <div className="relative flex h-10 shrink-0 items-center justify-center gap-2.5 border-b border-accent-dim/20 px-12 md:px-14">
        <span
          className="absolute start-3 top-1/2 inline-flex -translate-y-1/2 items-center font-mono text-sm font-black leading-none tabular-nums text-accent md:start-4"
          aria-label={currentLabel}
        >
          <span aria-hidden>#</span>
          <TimelineIndexTick value={currentNumber} />
        </span>
        <button
          type="button"
          onClick={onExpand}
          aria-haspopup="dialog"
          aria-label={expandLabel}
          title={expandLabel}
          className={`${styles.timelineExpandButton} absolute end-3 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full text-accent/70 hover:bg-accent/10 hover:text-accent active:scale-95 md:end-4`}
        >
          <Maximize2 size={17} strokeWidth={2} aria-hidden />
        </button>
        {positionLabel ? (
          hasPlace ? (
            <button
              type="button"
              tabIndex={isCurrent ? 0 : -1}
              onClick={onPlaceSelect}
              title={positionLabel}
              className="min-w-0 truncate font-mono text-sm font-semibold leading-none text-accent cursor-pointer hover:text-accent/80"
            >
              {positionLabel}
            </button>
          ) : (
            <span
              title={positionLabel}
              className="min-w-0 truncate font-mono text-sm font-semibold leading-none text-accent"
            >
              {positionLabel}
            </span>
          )
        ) : null}
      </div>

      {/* ── 3. 제목: 줄바꿈 허용, 자유 흐름 ── */}
      <h3 className="shrink-0 break-keep px-4 py-3 text-center text-lg font-bold leading-snug text-text-primary md:px-5 md:text-xl">
        {event.title}
      </h3>

      {/* ── 4. 본문 ── */}
      <JourneyActivityRange
        events={events}
        current={currentNumber - 1}
        label={activityRangeLabel}
        unknownLabel={unknownPlaceLabel}
        onChange={onChange}
      />

      <div
        data-timeline-body-scroll
        tabIndex={isCurrent ? 0 : -1}
        className="custom-scrollbar min-h-0 flex-1 touch-pan-y overflow-y-auto [overflow-anchor:none] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent"
      >
        <div className="px-4 py-4 md:px-5 md:py-5">
          <p className="break-keep break-words text-[15px] leading-[1.8] text-text-secondary md:text-base">
            {event.description ?? "-"}
          </p>
        </div>
      </div>

      {/* ── 5. 발: 이전/쪽 표시/다음 ── */}
      <div className="flex shrink-0 items-center gap-2 border-t border-accent-dim/20 px-2 py-0 md:px-3">
        <button
          data-timeline-rail="previous"
          type="button"
          onClick={onPrevious}
          disabled={previousDisabled}
          aria-label={previousLabel}
          className={`${styles.timelineNavButton} flex size-10 shrink-0 items-center justify-center rounded-full text-text-secondary cursor-pointer hover:bg-white/5 hover:text-accent disabled:pointer-events-none disabled:opacity-20`}
        >
          <ArrowLeft size={22} aria-hidden />
        </button>

        <span className="min-w-0 flex-1 truncate text-center font-mono text-sm tracking-wide text-text-secondary/75">
          {pageLabel}
        </span>

        <button
          data-timeline-rail="next"
          data-timeline-next
          type="button"
          onClick={onNext}
          disabled={nextDisabled}
          aria-label={nextLabel}
          className={`${styles.timelineNavButton} flex size-10 shrink-0 items-center justify-center rounded-full text-text-secondary cursor-pointer hover:bg-white/5 hover:text-accent disabled:pointer-events-none disabled:opacity-20`}
        >
          <ArrowRight size={22} aria-hidden />
        </button>
      </div>
    </article>
  );
}
