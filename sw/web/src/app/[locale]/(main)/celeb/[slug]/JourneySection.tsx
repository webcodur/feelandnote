/* ─────────────────────────────────────────────
 * [celeb 상세] timeline — 연표·여정(지도 연동)
 * - 목차 위치: timeline
 * - 데이터: events(getCelebTimelineEvents) prop
 * - 함께 보기: JourneyEventCarousel.tsx, JourneyMapPanel.tsx, journeyTimeline.ts
 * ───────────────────────────────────────────── */
"use client";

import { useCallback, useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import type { CelebTimelineEvent } from "@/actions/celebs/getCelebTimelineEvents";
import type { GlobeMarker } from "@/components/shared/WorldGlobe";
import { CategoryTabFilter } from "@/components/ui/CategoryTabFilter";
import JourneyEventCarousel from "./JourneyEventCarousel";
import JourneyMapPanel from "./JourneyMapPanel";
import JourneyTimelineModal from "./JourneyTimelineModal";
import type { JourneyViewMode } from "./journeyTimeline";
import styles from "./CelebPageContent.module.css";

interface Props {
  events: CelebTimelineEvent[];
}

function mappedIdOf(event: CelebTimelineEvent | undefined): string | null {
  return event?.lat != null && event?.lng != null ? event.id : null;
}

export default function JourneySection({ events }: Props) {
  const t = useTranslations("celebPage");
  /* ── 1. 상태·표식 준비 ── */
  const [timelineModalOpen, setTimelineModalOpen] = useState(false);
  const closeTimelineModal = useCallback(() => setTimelineModalOpen(false), []);
  const [showCard, setShowCard] = useState(true);
  const [showMap, setShowMap] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(() => mappedIdOf(events[0]));
  const [focusId, setFocusId] = useState<string | null>(() => mappedIdOf(events[0]));
  const [focusKey, setFocusKey] = useState(0);
  const [unknownKey, setUnknownKey] = useState(() => mappedIdOf(events[0]) ? 0 : 1);
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
  /* ── 2. 지도·연표 연동 ── */
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
  const effectiveShowMap = hasMap && showMap;
  const effectiveShowCard = !hasMap || showCard;
  const sideBySide = effectiveShowCard && effectiveShowMap;
  const mapOnly = !effectiveShowCard && effectiveShowMap;
  const panelView: JourneyViewMode = sideBySide ? "both" : mapOnly ? "atlas" : "timeline";
  return (
    <div className={`${styles.recordContentGap} space-y-2 md:space-y-4`}>
      {/* 카드·지도 선택 옆에 전체 타임라인 버튼을 붙인다. */}
      <div className="hidden items-center justify-center md:flex">
        {hasMap ? (
          <div>
            {/* 카드·지도 겹선택은 library와 같은 공용 칩으로 그린다.
                둘 다 켜진 전체 상태는 value를 옵션 밖에 두어 faintAllActive의
                은은한 전체 활성으로 보인다. 하나만 켜진 상태에서 어느 쪽을
                눌러도 전체로 돌아간다(library 필터와 같은 동작). */}
            <CategoryTabFilter
              subtle
              size="sm"
              faintAllActive
              options={[
                { value: "card", label: t("timelineOptCard") },
                { value: "map", label: t("timelineOptMap") },
              ]}
              value={showCard && showMap ? "all" : showCard ? "card" : "map"}
              onChange={(v) => {
                if (showCard && showMap) {
                  if (v === "card") setShowCard(false);
                  else if (v === "map") setShowMap(false);
                } else {
                  setShowCard(true);
                  setShowMap(true);
                }
              }}
            />
          </div>
        ) : null}
      </div>
      {/* ── 3. 연표/지도 ── */}
      {/* 지구본은 한 자리에 두고 배치만 바꾼다 — 옮겨 심으면 돌려놓은 각도가 풀린다 */}
      <div
        className={
          sideBySide
            ? "flex flex-col gap-4 md:grid md:grid-cols-[minmax(0,1fr)_440px] md:gap-6 md:items-start"
            : ""
        }
      >
        <div className={mapOnly ? "min-w-0 md:hidden" : "min-w-0"}>
          <JourneyEventCarousel
            events={events}
            current={at}
            onChange={go}
            onPlaceSelect={handlePick}
            onExpand={() => setTimelineModalOpen(true)}
            expandLabel={t("timelineViewExpand")}
          />
        </div>
        {hasMap && (
          <div className="hidden min-w-0 md:block">
            <JourneyMapPanel
              markers={markers}
              activeId={activeId}
              focusId={focusId}
              focusKey={focusKey}
              unknownKey={unknownKey}
              view={panelView}
              event={event}
              current={at}
              total={total}
              onSelect={handleGlobeSelect}
              onNavigate={go}
            />
          </div>
        )}
      </div>
      <JourneyTimelineModal
        open={timelineModalOpen}
        events={events}
        title={t("timeline")}
        closeLabel={t("timelineClose")}
        onClose={closeTimelineModal}
      />
    </div>
  );
}
