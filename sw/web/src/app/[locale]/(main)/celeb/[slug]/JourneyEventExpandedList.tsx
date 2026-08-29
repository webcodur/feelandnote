"use client";

import { useLocale, useTranslations } from "next-intl";
import { MapPin } from "lucide-react";

import type { CelebTimelineEvent } from "@/actions/celebs/getCelebTimelineEvents";
import {
  formatTimelinePosition,
  timelineYearCopy,
} from "./journeyTimeline";

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
      className="custom-scrollbar max-h-[500px] overflow-y-auto [overflow-anchor:none] px-1 py-1 pr-2.5 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent md:max-h-[580px] md:pr-4"
    >
      <div className="relative border-s border-accent-dim/25 ps-4.5 space-y-6 my-1.5 md:ps-6 md:space-y-7">
        {events.map((event, index) => {
          const yearLabel = formatEventYear(event, yearCopy);
          const sourceLabel = event.sequenceLabel?.trim() ?? "";
          const placeName = event.placeName?.trim() ?? "";
          const hasPlace = event.lat != null && event.lng != null;

          return (
            <article key={event.id ?? index} className="group relative">
              {/* 좌측 타임라인 노드 - 불투명 채움으로 뒤의 수직선 가림 */}
              <span
                aria-hidden
                className="absolute -start-[23px] top-1.5 z-10 h-2 w-2 rounded-full border border-accent/70 bg-[#080b0e] transition-colors group-hover:border-accent group-hover:bg-accent md:-start-[29px] md:h-2.5 md:w-2.5"
              />

              {/* 헤드라인: [ #1 | 연도(실존인물) ] + [ 제목 ] */}
              <div className="mb-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <span className="font-mono text-xs font-semibold text-text-tertiary">
                  #{index + 1}
                </span>
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
