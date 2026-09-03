/* ─────────────────────────────────────────────
 * [celeb 상세] timeline — 연표 펼침 목록
 * - 목차 위치: timeline
 * - 데이터: events props
 * - 함께 보기: JourneySection.tsx, journeyTimeline.ts
 * ───────────────────────────────────────────── */
"use client";

import { useTranslations } from "next-intl";
import { MapPin } from "lucide-react";

import SwipeControls from "@/components/ui/SwipeControls";
import type { CelebTimelineEvent } from "@/actions/celebs/getCelebTimelineEvents";
import { timelineYearCopy } from "./journeyTimeline";
import TimelineIndexTick from "./TimelineIndexTick";

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
      className="md:custom-scrollbar px-4 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent md:max-h-[580px] md:overflow-y-auto md:[overflow-anchor:none]"
    >
      {/* 연대기 카드와 같은 언어: 머리(번호·연도·지명) + 제목 + 본문. 수직선 레일은 걷는다.
          좁은 화면에서는 한 장씩 옆으로 넘긴다 — 세로로 전부 훑지 않아도 된다 */}
      <div className="flex snap-x snap-mandatory items-start gap-3 overflow-x-auto overscroll-x-contain py-1 [scrollbar-width:none] md:block md:space-y-3 md:overflow-visible">
        {events.map((event, index) => {
          const yearLabel = formatEventYear(event, yearCopy);
          const sourceLabel = event.sequenceLabel?.trim() ?? "";
          const placeName = event.placeName?.trim() ?? "";
          const hasPlace = event.lat != null && event.lng != null;
          const headMeta = [yearLabel, placeName].filter(Boolean).join(" · ");

          return (
            <article
              key={event.id ?? index}
              className="group w-full shrink-0 snap-start overflow-hidden rounded-xl border border-white/[0.08] bg-bg-secondary/35 md:w-auto md:shrink"
            >
              {/* 머리: 번호 + 연도·지명 — 연대기 카드 머리줄과 같은 자리 */}
              <div className="flex items-center gap-3 border-b border-accent-dim/20 px-4 py-2.5">
                <span
                  aria-label={t("timelineCurrent", { current: index + 1 })}
                  className="flex size-7 shrink-0 items-center justify-center rounded-full border border-accent/70 bg-accent/10 font-mono text-xs font-black leading-none tabular-nums text-accent"
                >
                  <TimelineIndexTick value={index + 1} />
                </span>
                {headMeta ? (
                  <p className="min-w-0 truncate font-mono text-sm font-semibold leading-none text-accent">
                    {headMeta}
                  </p>
                ) : null}
              </div>

              <div className="px-4 py-3 md:px-5 md:py-4">
                <h3 className="text-lg font-bold leading-snug text-text-primary md:text-xl">
                  {event.title}
                </h3>

                {/* 본문 내용 */}
                {event.description ? (
                  <p className="mt-2 break-keep break-words text-[15px] leading-[1.8] text-text-secondary md:text-base">
                    {event.description}
                  </p>
                ) : null}

                {/* 출처 & 지명 메타 (본문 뒤쪽으로 은은하게 배치) */}
                {sourceLabel || placeName ? (
                  <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-text-tertiary">
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
                          className="inline-flex items-center gap-1 text-text-tertiary hover:text-accent cursor-pointer"
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
              </div>
            </article>
          );
        })}
      </div>

      {/* 넘길 수 있다는 표시 — 넓은 화면에서는 목록이 세로로 서므로 사라진다 */}
      <SwipeControls count={events.length} />
    </div>
  );
}
