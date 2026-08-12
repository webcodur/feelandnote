import type { CelebTimelineEvent } from "@/actions/celebs/getCelebTimelineEvents";

export type JourneyViewMode = "both" | "timeline" | "atlas";

function formatYear(year: number, yearEnd: number | null, bc: string): string {
  const one = (value: number) =>
    value < 0 ? `${bc} ${Math.abs(value)}` : `${value}`;
  if (yearEnd == null || yearEnd === year) return one(year);
  if (year < 0 === yearEnd < 0) return `${one(year)}–${Math.abs(yearEnd)}`;
  return `${one(year)}–${one(yearEnd)}`;
}

export function formatTimelinePosition(
  event: CelebTimelineEvent,
  bc: string,
): string {
  if (event.sequenceLabel) return event.sequenceLabel;
  if (event.year != null) return formatYear(event.year, event.yearEnd, bc);
  return "";
}
