import type { CelebTimelineEvent } from "@/actions/celebs/getCelebTimelineEvents";

export type JourneyViewMode = "both" | "timeline" | "atlas";

export type TimelineYearCopy = {
  year: (year: number) => string;
  yearBc: (year: number) => string;
  yearRange: (start: number, end: number) => string;
  yearRangeBc: (start: number, end: number) => string;
};

export function timelineYearCopy(
  t: (key: string, values: Record<string, number>) => string,
): TimelineYearCopy {
  return {
    year: (year) => t("timelineYear", { year }),
    yearBc: (year) => t("timelineYearBc", { year }),
    yearRange: (start, end) => t("timelineYearRange", { start, end }),
    yearRangeBc: (start, end) => t("timelineYearRangeBc", { start, end }),
  };
}

export function formatTimelinePosition(
  event: CelebTimelineEvent,
  copy: TimelineYearCopy,
): string {
  if (event.sequenceLabel) return event.sequenceLabel;
  if (event.year == null) return "";

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

export function formatTimelineHeadline(
  event: CelebTimelineEvent,
  copy: TimelineYearCopy,
  join: (when: string, place: string) => string,
): string {
  const when = formatTimelinePosition(event, copy);
  const place = event.placeName?.trim() ?? "";
  if (when && place) return join(when, place);
  return when || place;
}
