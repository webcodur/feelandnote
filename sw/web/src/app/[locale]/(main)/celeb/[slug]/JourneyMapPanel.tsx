"use client";

import { useCallback, useState } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";

import type { CelebTimelineEvent } from "@/actions/celebs/getCelebTimelineEvents";
import type { GlobeMarker } from "@/components/shared/WorldGlobe";
import { globeFrameStyle } from "@/components/shared/WorldGlobe/globeLayout";
import JourneyGlobeModal from "./JourneyGlobeModal";
import {
  formatTimelinePosition,
  timelineYearCopy,
  type JourneyViewMode,
} from "./journeyTimeline";

const WorldGlobe = dynamic(() => import("@/components/shared/WorldGlobe"), {
  ssr: false,
  loading: () => (
    <div
      data-globe-loading
      className="absolute inset-0 rounded border border-accent-dim/20 bg-bg-secondary/60"
    />
  ),
});

interface Props {
  markers: GlobeMarker[];
  activeId: string | null;
  focusId: string | null;
  focusKey: number;
  unknownKey: number;
  view: JourneyViewMode;
  event: CelebTimelineEvent | undefined;
  current: number;
  total: number;
  onSelect: (id: string) => void;
  onNavigate: (next: number) => void;
}

export default function JourneyMapPanel({
  markers,
  activeId,
  focusId,
  focusKey,
  unknownKey,
  view,
  event,
  current,
  total,
  onSelect,
  onNavigate,
}: Props) {
  const t = useTranslations("celebPage");
  const yearCopy = timelineYearCopy(t);
  const [expanded, setExpanded] = useState(false);
  const globeMaxHeight = view === "atlas" ? 620 : 460;
  const formatRecordCount = useCallback(
    (count: number) => t("timelineMapRecordCount", { count }),
    [t],
  );

  const globeProps = {
    markers,
    showPath: true,
    activeId,
    focusId,
    focusKey,
    unknownKey,
    onSelect,
    label: t("timelineMapLabel"),
    controlLabels: {
      zoomIn: t("timelineZoomIn"),
      zoomOut: t("timelineZoomOut"),
      reset: t("timelineResetView"),
    },
    mapNote: t("timelineModernBorders"),
    formatMarkerCount: formatRecordCount,
  };

  return (
    <>
      <div
        className={`space-y-2 ${view === "timeline" ? "hidden" : ""} ${
          view === "both" ? "order-first md:order-none" : ""
        }`}
      >
        <div data-globe-frame className="relative" style={globeFrameStyle(globeMaxHeight)}>
          <WorldGlobe
            {...globeProps}
            className="h-full"
            maxHeight={globeMaxHeight}
            onExpand={() => setExpanded(true)}
            expandLabel={t("timelineExpandMap")}
            expandAriaLabel={t("timelineExpandMapLabel")}
            allowPageScroll
          />
        </div>
      </div>

      <JourneyGlobeModal
        open={expanded}
        globe={
          <WorldGlobe
            {...globeProps}
            className="h-full rounded-none border-0"
            fillContainer
            initialZoom={0.48}
          />
        }
        event={event}
        yearLabel={event ? formatTimelinePosition(event, yearCopy) : null}
        current={current}
        total={total}
        pageLabel={t("timelinePage", { current: current + 1, total })}
        title={t("timelineFullscreenTitle")}
        closeLabel={t("timelineCloseMap")}
        previousLabel={t("timelinePrev")}
        nextLabel={t("timelineNext")}
        onClose={() => setExpanded(false)}
        onPrevious={() => onNavigate(current - 1)}
        onNext={() => onNavigate(current + 1)}
      />
    </>
  );
}
