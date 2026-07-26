"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { Columns2, Globe, List, MapPin } from "lucide-react";

import type { CelebTimelineEvent } from "@/actions/celebs/getCelebTimelineEvents";
import type { GlobeMarker } from "@/components/shared/WorldGlobe";

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

/** 나란히 보기 · 연표만 · 지도만 */
type ViewMode = "both" | "timeline" | "atlas";

export default function JourneySection({ events }: Props) {
  const t = useTranslations("celebPage");
  const [mode, setMode] = useState<ViewMode>("both");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [focusKey, setFocusKey] = useState(0);
  const itemRefs = useRef<Record<string, HTMLLIElement | null>>({});
  const listRef = useRef<HTMLDivElement>(null);

  // 좌표를 가진 항목만 지도에 오른다. 번호는 연표와 지도가 같은 것을 가리키도록 여기서 매긴다.
  const markers = useMemo<GlobeMarker[]>(
    () =>
      events
        .filter((e) => e.lat != null && e.lng != null)
        .map((e, i) => ({
          id: e.id,
          lat: e.lat as number,
          lng: e.lng as number,
          label: e.placeName ?? e.title,
          order: i + 1,
        })),
    [events],
  );

  const orderById = useMemo(() => {
    const map: Record<string, number> = {};
    for (const m of markers) map[m.id] = m.order as number;
    return map;
  }, [markers]);

  const handlePick = useCallback((id: string) => {
    setActiveId(id);
    setFocusId(id);
    setFocusKey((k) => k + 1);
  }, []);

  /* 지도에서 고른 곳을 연표 가운데로 옮긴다. 연표 칸만 움직이고 페이지 자체는
     제자리에 둔다 — scrollIntoView는 바깥 페이지까지 끌어당겨 화면이 튄다. */
  const handleGlobeSelect = useCallback((id: string) => {
    setActiveId(id);
    const node = itemRefs.current[id];
    const box = listRef.current;
    if (!node || !box) return;
    const top = node.offsetTop - box.clientHeight / 2 + node.clientHeight / 2;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    box.scrollTo({ top: Math.max(0, top), behavior: reduceMotion ? "auto" : "smooth" });
  }, []);

  const bc = t("timelineBc");
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
                    : "text-text-tertiary hover:text-text-primary"
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
            ? "flex flex-col gap-4 md:grid md:grid-cols-[1fr_320px] md:gap-6 md:items-start"
            : ""
        }
      >
        {/* 나란히 볼 때만 연표 칸에 스크롤을 둔다. 혼자일 때는 자연스럽게 흐르게 놔둔다.
            overscroll-contain — 목록 끝에서 굴려도 페이지가 따라 움직이지 않는다. */}
        <div
          ref={listRef}
          className={`${view === "atlas" ? "hidden" : ""} ${
            sideBySide ? "md:max-h-[460px] md:overflow-y-auto md:overscroll-contain md:pr-2" : ""
          }`}
        >
          <ol className="space-y-3">
          {events.map((event) => {
            const order = orderById[event.id];
            const isActive = event.id === activeId;
            const hasPlace = order != null;

            return (
              <li
                key={event.id}
                ref={(node) => {
                  itemRefs.current[event.id] = node;
                }}
              >
                <button
                  type="button"
                  onClick={() => hasPlace && handlePick(event.id)}
                  disabled={!hasPlace}
                  className={`w-full text-left rounded border px-3 py-2.5 ${
                    isActive
                      ? "border-accent bg-accent/5"
                      : "border-accent-dim/25 hover:border-accent"
                  } ${hasPlace ? "cursor-pointer" : "cursor-default"}`}
                >
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="font-mono text-sm text-accent shrink-0">
                      {formatYear(event.year, event.yearEnd, bc)}
                    </span>
                    <span className="font-serif text-[15px] text-text-primary break-keep">
                      {event.title}
                    </span>
                  </div>

                  {event.placeName && (
                    <p className="mt-1 flex items-center gap-1 text-xs text-text-tertiary">
                      <MapPin size={12} className={hasPlace ? "text-accent/70" : "opacity-40"} />
                      <span>{event.placeName}</span>
                      {hasPlace && (
                        <span className="font-mono text-accent/60">#{order}</span>
                      )}
                    </p>
                  )}

                  {event.description && (
                    <p className="mt-1.5 text-sm text-text-secondary leading-relaxed break-keep">
                      {event.description}
                    </p>
                  )}
                </button>
              </li>
            );
          })}
          </ol>
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
            />
            <p className="text-xs text-text-tertiary leading-relaxed">
              {view === "atlas" ? t("timelineMapHintAlone") : t("timelineMapHint")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
