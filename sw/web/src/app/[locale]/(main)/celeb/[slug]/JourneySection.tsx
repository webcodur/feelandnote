"use client";

import { useCallback, useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import type { CelebTimelineEvent } from "@/actions/celebs/getCelebTimelineEvents";
import type { GlobeMarker } from "@/components/shared/WorldGlobe";
import JourneyEventCarousel from "./JourneyEventCarousel";
import JourneyMapPanel from "./JourneyMapPanel";
import type { JourneyViewMode } from "./journeyTimeline";

interface Props {
  events: CelebTimelineEvent[];
}

function mappedIdOf(event: CelebTimelineEvent | undefined): string | null {
  return event?.lat != null && event?.lng != null ? event.id : null;
}

export default function JourneySection({ events }: Props) {
  const t = useTranslations("celebPage");
  const [mode, setMode] = useState<JourneyViewMode>("both");
  const [activeId, setActiveId] = useState<string | null>(() => mappedIdOf(events[0]));
  const [focusId, setFocusId] = useState<string | null>(() => mappedIdOf(events[0]));
  const [focusKey, setFocusKey] = useState(0);
  const [unknownKey, setUnknownKey] = useState(() =>
    mappedIdOf(events[0]) ? 0 : 1,
  );
  const [index, setIndex] = useState(0);

  // 좌표를 가진 항목만 지도에 오른다.
  const markers = useMemo<GlobeMarker[]>(
    () =>
      events
        .filter((e) => e.lat != null && e.lng != null)
        .map((e) => ({
          id: e.id,
          lat: e.lat as number,
          lng: e.lng as number,
          label: e.placeName ?? e.title,
        })),
    [events],
  );

  const handlePick = useCallback((id: string) => {
    setActiveId(id);
    setFocusId(id);
    setFocusKey((k) => k + 1);
  }, []);

  /* 지도에서 고른 곳을 연표에 띄운다. 페이지 자체는 제자리에 둔다 —
     scrollIntoView는 바깥 페이지까지 끌어당겨 화면이 튄다. */
  const handleGlobeSelect = useCallback(
    (id: string) => {
      setActiveId(id);
      setFocusId(id);
      setFocusKey((k) => k + 1);
      const at = events.findIndex((e) => e.id === id);
      if (at >= 0) setIndex(at);
    },
    [events],
  );
  const total = events.length;
  const at = Math.min(index, Math.max(0, total - 1));
  const event = events[at];

  /* 사건을 넘기면 지구본도 그 자리로 돈다 — 좌표가 없는 사건은 지도에서 고를 것이 없으니
     강조만 푼다. 지도에서 고른 경우는 이미 그곳을 보고 있으므로 다시 돌리지 않는다. */
  const go = useCallback(
    (next: number) => {
      const bounded = Math.max(0, Math.min(total - 1, next));
      if (bounded === at) return;
      setIndex(bounded);

      const target = events[bounded];
      if (target && target.lat != null && target.lng != null) {
        setActiveId(target.id);
        setFocusId(target.id);
        setFocusKey((k) => k + 1);
      } else {
        setActiveId(null);
        setFocusId(null);
        setUnknownKey((k) => k + 1);
      }
    },
    [at, events, total],
  );

  const hasMap = markers.length > 0;
  // 지도에 찍을 곳이 하나도 없으면 고를 것이 없다 — 연표만 보여준다
  const view: JourneyViewMode = hasMap ? mode : "timeline";
  const sideBySide = view === "both";

  const tabs = [
    { key: "both" as const, label: t("timelineViewBoth") },
    { key: "timeline" as const, label: t("timelineViewList") },
    { key: "atlas" as const, label: t("timelineViewMap") },
  ];

  return (
    <div className="space-y-4">
      {hasMap && (
        <div className="grid grid-cols-3 border-b border-accent-dim/25">
          {tabs.map((tab) => {
            const on = view === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setMode(tab.key)}
                aria-pressed={on}
                className={`flex items-center justify-center truncate py-2 text-sm font-medium cursor-pointer ${
                  on
                    ? "text-accent border-b-2 border-accent"
                    : " hover:text-text-primary"
                }`}
              >
                <span className="truncate">{tab.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* 지구본은 한 자리에 두고 배치만 바꾼다 — 옮겨 심으면 돌려놓은 각도가 풀린다 */}
      <div
        className={
          sideBySide
            ? "flex flex-col gap-4 md:grid md:grid-cols-[minmax(0,1fr)_440px] md:gap-6 md:items-start"
            : ""
        }
      >
        <div className={view === "atlas" ? "hidden" : "min-w-0"}>
          <JourneyEventCarousel
            events={events}
            current={at}
            onChange={go}
            onPlaceSelect={handlePick}
          />
        </div>

        {hasMap && (
          <JourneyMapPanel
            markers={markers}
            activeId={activeId}
            focusId={focusId}
            focusKey={focusKey}
            unknownKey={unknownKey}
            view={view}
            event={event}
            current={at}
            total={total}
            onSelect={handleGlobeSelect}
            onNavigate={go}
          />
        )}
      </div>
    </div>
  );
}
