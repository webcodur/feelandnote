import type { CelebTimelineEvent } from "@/actions/celebs/getCelebTimelineEvents";

import TimelineIndexTick from "./TimelineIndexTick";

interface Props {
  event: CelebTimelineEvent;
  isCurrent: boolean;
  positionLabel: string;
  currentNumber: number;
  currentLabel: string;
  totalLabel: string;
  onPlaceSelect: () => void;
}

export default function JourneyEventCard({
  event,
  isCurrent,
  positionLabel,
  currentNumber,
  currentLabel,
  totalLabel,
  onPlaceSelect,
}: Props) {
  const hasPlace = event.lat != null && event.lng != null;

  return (
    <article
      data-timeline-current={isCurrent ? "" : undefined}
      aria-hidden={!isCurrent}
      className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-bg-secondary/35"
    >
      <div className="grid min-h-12 shrink-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-accent-dim/20 px-4 py-2 md:px-5">
        <p
          className="justify-self-start font-mono text-sm leading-none text-text-tertiary"
          aria-label={currentLabel}
        >
          #<TimelineIndexTick value={currentNumber} />
        </p>
        {positionLabel ? (
          hasPlace ? (
            <button
              type="button"
              tabIndex={isCurrent ? 0 : -1}
              onClick={onPlaceSelect}
              className="min-w-0 break-words text-center font-mono text-sm font-semibold leading-snug text-accent hover:text-accent/80"
            >
              {positionLabel}
            </button>
          ) : (
            <p className="min-w-0 break-words text-center font-mono text-sm font-semibold leading-snug text-accent">
              {positionLabel}
            </p>
          )
        ) : (
          <span aria-hidden className="block" />
        )}
        <p className="justify-self-end font-mono text-sm leading-none text-text-tertiary">
          {totalLabel}
        </p>
      </div>

      <div
        data-timeline-body-scroll
        tabIndex={isCurrent ? 0 : -1}
        className="custom-scrollbar min-h-0 flex-1 touch-pan-y overflow-y-auto [overflow-anchor:none] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent"
      >
        <div className="border-b border-accent-dim/20 px-4 py-4 md:px-5">
          <h3 className="text-center text-lg font-bold leading-snug text-text-primary md:text-xl">
            {event.title}
          </h3>
        </div>

        <div className="px-4 py-4 md:px-5 md:py-5">
          <p className="break-keep break-words text-[15px] leading-[1.8] text-text-secondary md:text-base">
            {event.description ?? "-"}
          </p>
        </div>
      </div>
    </article>
  );
}
