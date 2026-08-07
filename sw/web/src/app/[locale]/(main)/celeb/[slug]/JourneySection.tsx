"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { ArrowLeft, ArrowRight, Columns2, Globe, List, MapPin } from "lucide-react";

import type { CelebTimelineEvent } from "@/actions/celebs/getCelebTimelineEvents";
import type { GlobeMarker } from "@/components/shared/WorldGlobe";
import JourneyGlobeModal from "./JourneyGlobeModal";

/* 지구본은 지도 계산 꾸러미를 함께 싣는다. 첫 화면 HTML에는 필요 없으므로
   브라우저에서 따로 불러온다 — 연표 글은 그대로 서버에서 그려져 검색에 잡힌다. */
const WorldGlobe = dynamic(() => import("@/components/shared/WorldGlobe"), {
  ssr: false,
  loading: () => (
    <div className="h-[320px] rounded border border-accent-dim/20 bg-bg-secondary/60" />
  ),
});

interface Props {
  events: CelebTimelineEvent[];
}

/** 기원전은 앞에 BC를 붙인다. 기간이면 두 해를 잇는다. */
function formatYear(year: number, yearEnd: number | null, bc: string): string {
  const one = (y: number) => (y < 0 ? `${bc} ${Math.abs(y)}` : `${y}`);
  if (yearEnd == null || yearEnd === year) return one(year);
  // 같은 시대 안의 기간이면 뒤쪽 표기를 줄인다: BC 343–340
  if (year < 0 === yearEnd < 0) return `${one(year)}–${Math.abs(yearEnd)}`;
  return `${one(year)}–${one(yearEnd)}`;
}

/** 실존 인물은 연도, fiction 인물은 원전 안의 서사 단계가 위치 표지가 된다. */
function formatPosition(event: CelebTimelineEvent, bc: string): string {
  if (event.sequenceLabel) return event.sequenceLabel;
  if (event.year != null) return formatYear(event.year, event.yearEnd, bc);
  return "";
}

/** 나란히 보기 · 연표만 · 지도만 */
type ViewMode = "both" | "timeline" | "atlas";

/** 손가락으로 밀었다고 볼 최소 거리(px) */
const SWIPE_MIN = 40;

export default function JourneySection({ events }: Props) {
  const t = useTranslations("celebPage");
  const [mode, setMode] = useState<ViewMode>("both");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [focusKey, setFocusKey] = useState(0);
  const [index, setIndex] = useState(0);
  const [dragX, setDragX] = useState(0);
  const [mapExpanded, setMapExpanded] = useState(false);
  const swipeRef = useRef({ x: 0, y: 0, active: false, moved: false });
  const trackRef = useRef<HTMLDivElement>(null);

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
      const at = events.findIndex((e) => e.id === id);
      if (at >= 0) setIndex(at);
    },
    [events],
  );
  const formatMapRecordCount = useCallback(
    (count: number) => t("timelineMapRecordCount", { count }),
    [t],
  );
  const closeExpandedMap = useCallback(() => setMapExpanded(false), []);

  const bc = t("timelineBc");
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
      }
    },
    [at, events, total],
  );

  /* 밀면 카드가 손을 따라오고, 놓으면 다음 사건 자리로 미끄러져 붙는다.
     세로로 그은 것은 페이지 스크롤이니 가로로 확실히 기울었을 때만 따라간다. */
  const handleDragStart = useCallback((e: React.PointerEvent) => {
    swipeRef.current = { x: e.clientX, y: e.clientY, active: true, moved: false };
  }, []);

  const handleDragMove = useCallback(
    (e: React.PointerEvent) => {
      const drag = swipeRef.current;
      if (!drag.active) return;
      const dx = e.clientX - drag.x;
      const dy = e.clientY - drag.y;

      if (!drag.moved) {
        if (Math.abs(dx) < 6) return;
        if (Math.abs(dx) <= Math.abs(dy)) {
          drag.active = false;
          return;
        }
        drag.moved = true;
      }

      // 처음과 끝에서는 덜 끌려와 더 갈 곳이 없음을 손끝으로 알린다
      const atEdge = (at === 0 && dx > 0) || (at === total - 1 && dx < 0);
      setDragX(atEdge ? dx * 0.3 : dx);
    },
    [at, total],
  );

  const handleDragEnd = useCallback(() => {
    const drag = swipeRef.current;
    const shifted = dragX;
    drag.active = false;
    setDragX(0);
    if (!shifted) return;

    const width = trackRef.current?.clientWidth ?? 0;
    const threshold = width ? Math.min(SWIPE_MIN, width * 0.2) : SWIPE_MIN;
    if (Math.abs(shifted) >= threshold) go(shifted < 0 ? at + 1 : at - 1);
  }, [at, dragX, go]);
  const hasMap = markers.length > 0;
  // 지도에 찍을 곳이 하나도 없으면 고를 것이 없다 — 연표만 보여준다
  const view: ViewMode = hasMap ? mode : "timeline";
  const sideBySide = view === "both";

  const tabs = [
    { key: "both" as const, label: t("timelineViewBoth"), icon: Columns2 },
    { key: "timeline" as const, label: t("timelineViewList"), icon: List },
    { key: "atlas" as const, label: t("timelineViewMap"), icon: Globe },
  ];

  return (
    <div className="space-y-4">
      {hasMap && (
        <div className="grid grid-cols-3 border-b border-accent-dim/25">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const on = view === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setMode(tab.key)}
                aria-pressed={on}
                className={`flex items-center justify-center gap-1.5 truncate py-2 text-sm font-medium cursor-pointer ${
                  on
                    ? "text-accent border-b-2 border-accent"
                    : " hover:text-text-primary"
                }`}
              >
                <Icon size={15} strokeWidth={1.8} aria-hidden />
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

        {/* 한 사건을 연도·제목·위치·내용 네 구획으로 읽고, 양옆 화살표로 넘긴다. */}
        <div
          className={
            view === "atlas"
              ? "hidden"
              : "grid min-w-0 grid-cols-[36px_minmax(0,1fr)_36px] items-stretch gap-2 md:grid-cols-[42px_minmax(0,1fr)_42px] md:gap-3"
          }
        >
          <button
            type="button"
            onClick={() => go(at - 1)}
            disabled={at === 0}
            aria-label={t("timelinePrev")}
            className="flex min-h-44 items-center justify-center rounded border border-accent-dim/25 bg-bg-secondary/40 text-text-secondary hover:border-accent hover:bg-accent/10 hover:text-accent disabled:pointer-events-none disabled:opacity-20 md:min-h-[300px]"
          >
            <ArrowLeft size={20} strokeWidth={1.6} aria-hidden />
          </button>

          {/* 사건을 옆으로 나란히 깔고 띠를 밀어 보여준다 — 손을 따라오다 놓으면 제자리에 붙는다.
              touch-pan-y — 세로로 그으면 페이지가 스크롤되고, 가로로 그으면 사건이 넘어간다 */}
          <div
            ref={trackRef}
            className="w-full min-w-0 overflow-hidden touch-pan-y"
            onPointerDown={handleDragStart}
            onPointerMove={handleDragMove}
            onPointerUp={handleDragEnd}
            onPointerCancel={handleDragEnd}
            onPointerLeave={handleDragEnd}
          >
            <div
              className="flex h-full items-stretch"
              style={{
                transform: `translateX(calc(${-at * 100}% + ${dragX}px))`,
                transition: dragX ? "none" : "transform 300ms ease-out",
              }}
            >
              {events.map((item, itemIndex) => {
                const hasPlace = item.lat != null && item.lng != null;

                return (
                  <article
                    key={item.id}
                    className="flex min-h-44 w-full shrink-0 flex-col overflow-hidden rounded border border-accent-dim/30 bg-bg-secondary/35 md:min-h-[300px]"
                  >
                    <div className="flex items-center justify-between gap-3 border-b border-accent-dim/20 px-4 py-3 md:px-5">
                      <p className="font-mono text-base font-semibold text-accent">
                        {formatPosition(item, bc)}
                      </p>
                      <p className="shrink-0 font-mono text-sm text-text-tertiary">
                        {t("timelinePage", { current: itemIndex + 1, total })}
                      </p>
                    </div>

                    <div className="border-b border-accent-dim/20 px-4 py-4 md:px-5">
                      <h3 className="font-serif text-lg font-bold leading-snug text-text-primary md:text-xl">
                        {item.title}
                      </h3>
                    </div>

                    <div className="border-b border-accent-dim/20 px-4 py-3 md:px-5">
                      {item.placeName ? (
                        <button
                          type="button"
                          onClick={() => {
                            if (swipeRef.current.moved) return;
                            handlePick(item.id);
                          }}
                          disabled={!hasPlace}
                          className={`flex items-center gap-2 text-left text-sm ${
                            hasPlace
                              ? "cursor-pointer text-text-secondary hover:text-accent"
                              : "cursor-default text-text-tertiary"
                          }`}
                        >
                          <MapPin size={15} className="shrink-0" aria-hidden />
                          <span>{item.placeName}</span>
                        </button>
                      ) : (
                        <p className="flex items-center gap-2 text-sm text-text-tertiary">
                          <MapPin size={15} className="shrink-0" aria-hidden />
                          <span aria-hidden>—</span>
                        </p>
                      )}
                    </div>

                    <div className="flex-1 px-4 py-4 md:px-5 md:py-5">
                      <p className="text-[15px] leading-[1.8] text-text-secondary break-keep break-words md:text-base">
                        {item.description ?? "—"}
                      </p>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>

          <button
            type="button"
            onClick={() => go(at + 1)}
            disabled={at >= total - 1}
            aria-label={t("timelineNext")}
            className="flex min-h-44 items-center justify-center rounded border border-accent-dim/25 bg-bg-secondary/40 text-text-secondary hover:border-accent hover:bg-accent/10 hover:text-accent disabled:pointer-events-none disabled:opacity-20 md:min-h-[300px]"
          >
            <ArrowRight size={20} strokeWidth={1.6} aria-hidden />
          </button>
        </div>

        {hasMap && (
          <div
            className={`space-y-2 ${view === "timeline" ? "hidden" : ""} ${
              // 좁은 화면에서 나란히 보기일 때는 지도를 연표 위로 올린다
              sideBySide ? "order-first md:order-none" : ""
            }`}
          >
            <WorldGlobe
              markers={markers}
              showPath
              activeId={activeId}
              focusId={focusId}
              focusKey={focusKey}
              onSelect={handleGlobeSelect}
              label={t("timelineMapLabel")}
              maxHeight={view === "atlas" ? 620 : 460}
              controlLabels={{
                zoomIn: t("timelineZoomIn"),
                zoomOut: t("timelineZoomOut"),
                reset: t("timelineResetView"),
              }}
              mapNote={t("timelineModernBorders")}
              formatMarkerCount={formatMapRecordCount}
              onExpand={() => setMapExpanded(true)}
              expandLabel={t("timelineExpandMap")}
              expandAriaLabel={t("timelineExpandMapLabel")}
            />
          </div>
        )}
      </div>

      <JourneyGlobeModal
        open={mapExpanded}
        globe={
          <WorldGlobe
            markers={markers}
            showPath
            activeId={activeId}
            focusId={focusId}
            focusKey={focusKey}
            onSelect={handleGlobeSelect}
            label={t("timelineMapLabel")}
            className="h-full rounded-none border-0"
            fillContainer
            initialZoom={0.48}
            controlLabels={{
              zoomIn: t("timelineZoomIn"),
              zoomOut: t("timelineZoomOut"),
              reset: t("timelineResetView"),
            }}
            mapNote={t("timelineModernBorders")}
            formatMarkerCount={formatMapRecordCount}
          />
        }
        event={event}
        yearLabel={event ? formatPosition(event, bc) : null}
        current={at}
        total={total}
        pageLabel={t("timelinePage", { current: at + 1, total })}
        title={t("timelineFullscreenTitle")}
        closeLabel={t("timelineCloseMap")}
        previousLabel={t("timelinePrev")}
        nextLabel={t("timelineNext")}
        onClose={closeExpandedMap}
        onPrevious={() => go(at - 1)}
        onNext={() => go(at + 1)}
      />
    </div>
  );
}
