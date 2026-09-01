"use client";

import { useTranslations } from "next-intl";
import { MapPin } from "lucide-react";

import type { CelebTimelineEvent } from "@/actions/celebs/getCelebTimelineEvents";
import { timelineYearCopy } from "./journeyTimeline";

interface Props {
  events: CelebTimelineEvent[];
  onPlaceSelect?: (id: string) => void;
}

function formatEventYear(
  event: CelebTimelineEvent,
  copy: ReturnType<typeof timelineYearCopy>,
): string | null {
  if (event.year == null) return null;
  const { year, yearEnd } = event;
  if (yearEnd == null || yearEnd === year) {
    return year < 0 ? copy.yearBc(Math.abs(year)) : copy.year(year);
  }
  if (year < 0 && yearEnd < 0) {
    return copy.yearRangeBc(Math.abs(year), Math.abs(yearEnd));
  }
  const start = year < 0 ? copy.yearBc(Math.abs(year)) : copy.year(year);
  const end = yearEnd < 0 ? copy.yearBc(Math.abs(yearEnd)) : copy.year(yearEnd);
  return `${start}–${end}`;
}

export default function JourneyEventExpandedList({
  events,
  onPlaceSelect,
}: Props) {
  const t = useTranslations("celebPage");
  const yearCopy = timelineYearCopy(t);

  return (
    <div
      tabIndex={0}
      aria-label={t("timelineViewExpand")}
      className="custom-scrollbar max-h-[500px] overflow-y-auto [overflow-anchor:none] py-1 pe-2.5 ps-4.5 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent md:max-h-[580px] md:pe-4"
    >
      <div className="relative ps-4.5 space-y-6 my-1.5 md:ps-6 md:space-y-7">
        {events.map((event, index) => {
          const yearLabel = formatEventYear(event, yearCopy);
          const sourceLabel = event.sequenceLabel?.trim() ?? "";
          const placeName = event.placeName?.trim() ?? "";
          const hasPlace = event.lat != null && event.lng != null;

          return (
            <article key={event.id ?? index} className="group relative">
              {/* 번호 마커가 수직선을 덮어 각 기록의 순서를 바로 보여 준다. */}
              <span
                aria-label={t("timelineCurrent", { current: index + 1 })}
                className="absolute -start-[33px] top-0 z-10 flex size-7 items-center justify-center rounded-full border border-accent/70 bg-bg-card font-mono text-[11px] font-black leading-none tabular-nums text-accent group-hover:border-accent group-hover:bg-accent/15 group-hover:text-accent-hover md:-start-[39px]"
              >
                {index + 1}
              </span>

              {/* 헤드라인: [연도] + [제목] */}
              <div className="mb-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                {yearLabel ? (
                  <span className="font-mono text-xs font-bold text-accent">
                    {yearLabel}
                  </span>
                ) : null}
                <h3 className="text-[15px] font-bold leading-snug text-text-primary md:text-base">
                  {event.title}
                </h3>
              </div>

              {/* 본문 내용 */}
              {event.description ? (
                <p className="break-keep break-words text-[14px] leading-[1.75] text-text-secondary md:text-[15px]">
                  {event.description}
                </p>
              ) : null}

              {/* 출처 & 지명 메타 (본문 뒤쪽으로 은은하게 배치) */}
              {sourceLabel || placeName ? (
                <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-text-tertiary">
                  {sourceLabel ? (
                    <span className="font-mono text-text-tertiary">
                      {sourceLabel}
                    </span>
                  ) : null}
                  {sourceLabel && placeName ? (
                    <span aria-hidden className="text-text-tertiary/40">
                      ·
                    </span>
                  ) : null}
                  {placeName ? (
                    hasPlace && onPlaceSelect ? (
                      <button
                        type="button"
                        onClick={() => onPlaceSelect(event.id)}
                        title={placeName}
                        className="inline-flex items-center gap-1 text-text-tertiary hover:text-accent cursor-pointer transition-colors"
                      >
                        <MapPin
                          size={11}
                          className="shrink-0 text-accent/70"
                          aria-hidden
                        />
                        <span className="truncate">{placeName}</span>
                      </button>
                    ) : (
                      <span className="inline-flex items-center gap-1">
                        <MapPin
                          size={11}
                          className="shrink-0 opacity-60"
                          aria-hidden
                        />
                        <span className="truncate">{placeName}</span>
                      </span>
                    )
                  ) : null}
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </div>
  );
}
