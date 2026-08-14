import { MapPin } from "lucide-react";

import type { CelebTimelineEvent } from "@/actions/celebs/getCelebTimelineEvents";

interface Props {
  event: CelebTimelineEvent;
  isCurrent: boolean;
  positionLabel: string;
  pageLabel: string;
  onPlaceSelect: () => void;
}

export default function JourneyEventCard({
  event,
  isCurrent,
  positionLabel,
  pageLabel,
  onPlaceSelect,
}: Props) {
  const hasPlace = event.lat != null && event.lng != null;

  return (
    <article
      data-timeline-current={isCurrent ? "" : undefined}
      aria-hidden={!isCurrent}
      className="flex h-full min-h-0 w-full shrink-0 flex-col overflow-hidden bg-bg-secondary/35"
    >
      <div className="flex items-center justify-between gap-3 border-b border-accent-dim/20 px-4 py-3 md:px-5">
        <p className="font-mono text-base font-semibold text-accent">
          {positionLabel}
        </p>
        <p className="shrink-0 font-mono text-sm text-text-tertiary">
          {pageLabel}
        </p>
      </div>

      <div
        data-timeline-body-scroll
        tabIndex={isCurrent ? 0 : -1}
        className="custom-scrollbar min-h-0 flex-1 touch-pan-y overflow-y-auto [overflow-anchor:none] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent"
      >
        <div className="border-b border-accent-dim/20 px-4 py-4 md:px-5">
          <h3 className="text-lg font-bold leading-snug text-text-primary md:text-xl">
            {event.title}
          </h3>
        </div>

        <div className="border-b border-accent-dim/20 px-4 py-3 md:px-5">
          {event.placeName ? (
            <button
              type="button"
              tabIndex={isCurrent ? 0 : -1}
              onClick={onPlaceSelect}
              disabled={!hasPlace}
              className={`flex items-center gap-2 text-start text-sm ${
                hasPlace
                  ? "text-text-secondary hover:text-accent"
                  : "cursor-default text-text-tertiary"
              }`}
            >
              <MapPin size={15} className="shrink-0" aria-hidden />
              <span>{event.placeName}</span>
            </button>
          ) : (
            <p className="flex items-center gap-2 text-sm text-text-tertiary">
              <MapPin size={15} className="shrink-0" aria-hidden />
              <span aria-hidden>-</span>
            </p>
          )}
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
