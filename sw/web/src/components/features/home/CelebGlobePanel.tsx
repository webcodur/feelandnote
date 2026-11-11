/*
  파일명: /components/features/home/CelebGlobePanel.tsx
  기능: 탐색 인물 목록의 지구본 보기
  책임: 국가별 인물 분포를 생년 범위에 맞춰 지구본에 칠하고, 나라·시대를 고르면
        목록 필터(국적·생년)를 바꾼다. 목록 조회는 아래 그리드가 그대로 맡는다.
*/ // ------------------------------

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import Modal from "@/components/ui/Modal";
import { PendingBlock, RetryBlock } from "@/components/ui/pending";
import type { GlobeCountry } from "@/components/shared/WorldGlobe";
import { getGlobeCountryName } from "@/components/shared/WorldGlobe/countryNames";
import { getCelebGeoYears, type CelebGeoYears } from "@/actions/home";
import { isCountryCode } from "@/lib/countries";
import { filterSelection } from "@/constants/celebFilterSelection";
import { ERAS, eraYearRange } from "@/components/features/user/explore/sections/TimelineSection/utils";
import { useNationalityLabel } from "@/hooks/useFilterLabels";
import useMediaQuery from "@/hooks/useMediaQuery";
import { BirthYearSliderCore } from "./CelebBirthYearFilter";
import type { useCelebFilters } from "./useCelebFilters";

const WorldGlobe = dynamic(() => import("@/components/shared/WorldGlobe"), {
  ssr: false,
  loading: () => <PendingBlock variant="panel" minHeight="min-h-full" className="absolute inset-0" />,
});
const NO_MARKERS: [] = [];

interface YearRange { min?: number; max?: number }

const CHIP_CLASS = "min-h-9 rounded-control border px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50";
const chipClass = (active: boolean) => `${CHIP_CLASS} ${active
  ? "border-accent/50 bg-accent/10 text-accent hover:bg-accent/20"
  : "border-line text-text-secondary hover:border-line-strong hover:bg-white/5 hover:text-text-primary"}`;

/** 생년 범위 안의 국가별 인물 수. 범위를 지정하면 생년을 모르는 인물은 빠진다(목록 조회와 같은 기준) */
function countByCountry(data: CelebGeoYears[], range: YearRange) {
  const unbounded = range.min === undefined && range.max === undefined;
  return data
    .map(({ code, years, unknownYears }) => ({
      code,
      count: unbounded ? years.length + unknownYears
        : years.filter(year => (range.min === undefined || year >= range.min) && (range.max === undefined || year <= range.max)).length,
    }))
    .filter(item => item.count > 0);
}

export default function CelebGlobePanel({ filters, onInteraction }: {
  filters: ReturnType<typeof useCelebFilters>;
  onInteraction?: () => void;
}) {
  const t = useTranslations("home.ui.globe");
  const tEra = useTranslations("explore.ui.timeline.eras");
  const map = useTranslations("celebPage");
  const getNationality = useNationalityLabel();
  const hasMouse = useMediaQuery("(hover: hover) and (pointer: fine)");
  const [data, setData] = useState<CelebGeoYears[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [expanded, setExpanded] = useState(false);
  // 슬라이더를 끄는 동안의 범위 — 놓기 전에는 지구본만 바꾸고 목록은 다시 부르지 않는다
  const [preview, setPreview] = useState<YearRange | null>(null);

  useEffect(() => {
    let alive = true;
    getCelebGeoYears().then(
      result => { if (alive) setData(result); },
      () => { if (alive) setFailed(true); },
    );
    return () => { alive = false; };
  }, [attempt]);

  const { birthYearMin, birthYearMax, nationality, isLoading, handleNationalityChange, handleBirthYearChange } = filters;
  const rangeMin = preview ? preview.min : birthYearMin;
  const rangeMax = preview ? preview.max : birthYearMax;
  const counts = useMemo(() => data ? countByCountry(data, { min: rangeMin, max: rangeMax }) : [], [data, rangeMin, rangeMax]);
  const total = counts.reduce((sum, item) => sum + item.count, 0);

  const globeCountries = useMemo<GlobeCountry[]>(() => {
    const onMap = counts.filter(item => isCountryCode(item.code));
    // 인물 수 차이가 수백 배라 로그 눈금으로 칠해야 작은 나라도 보인다
    const maxLog = Math.log1p(Math.max(1, ...onMap.map(item => item.count)));
    return onMap.map(({ code, count }) => ({
      id: code,
      name: getGlobeCountryName(code),
      label: t("figureCount", { count }),
      weight: Math.log1p(count) / maxLog,
    }));
  }, [counts, t]);
  const offMap = counts.filter(item => !isCountryCode(item.code));

  const selected = filterSelection(nationality);
  const activeCountry = selected.length === 1 ? selected[0] : null;

  // 같은 나라를 다시 누르면 국적 선택을 푼다
  const selectCountry = useCallback((code: string) => {
    onInteraction?.();
    handleNationalityChange(code === activeCountry ? "all" : code);
  }, [activeCountry, handleNationalityChange, onInteraction]);
  const changeYears = (min: number | undefined, max: number | undefined) => {
    setPreview(null);
    onInteraction?.();
    handleBirthYearChange(min, max);
  };

  const globeProps = useMemo(() => ({
    markers: NO_MARKERS,
    countries: globeCountries,
    activeId: activeCountry,
    focusId: activeCountry,
    onCountrySelect: selectCountry,
    label: t("label"),
    controlLabels: { zoomIn: map("timelineZoomIn"), zoomOut: map("timelineZoomOut"), reset: map("timelineResetView") },
    mapNote: map("timelineModernBorders"),
  }), [activeCountry, globeCountries, map, selectCountry, t]);

  if (failed) {
    return <RetryBlock onRetry={() => { setFailed(false); setAttempt(value => value + 1); }} />;
  }

  return (
    <section aria-label={t("label")} className="mb-6 overflow-hidden rounded-panel border border-line bg-bg-card" data-celeb-globe>
      <div className="relative h-[300px] md:h-[440px]">
        {data ? (
          <WorldGlobe {...globeProps} fillContainer className="h-full rounded-none border-0 bg-transparent" allowPageScroll={!hasMouse}
            onExpand={() => setExpanded(true)} expandLabel={map("timelineExpandMap")} expandAriaLabel={map("timelineExpandMapLabel")} />
        ) : (
          <PendingBlock variant="panel" minHeight="min-h-full" className="absolute inset-0" />
        )}
        <p className="pointer-events-none absolute bottom-3 left-3 max-w-[calc(100%-90px)] rounded bg-black/70 px-2 py-1 text-[11px] text-text-secondary">{t("hint")}</p>
      </div>

      <div className="space-y-4 border-t border-line p-4">
        <p role="status" className="text-center text-sm tabular-nums text-text-secondary">
          {data && (total > 0 ? t("summary", { count: total, countries: counts.length }) : t("empty"))}
        </p>

        <div role="group" aria-label={t("era")} className="flex flex-wrap justify-center gap-2">
          {ERAS.map((era, index) => {
            const eraRange = eraYearRange(index);
            const active = birthYearMin === eraRange.min && birthYearMax === eraRange.max;
            return (
              <button key={era.key} type="button" aria-pressed={active} disabled={isLoading}
                onClick={() => active ? changeYears(undefined, undefined) : changeYears(eraRange.min, eraRange.max)}
                className={chipClass(active)}>
                {tEra(era.key)}
              </button>
            );
          })}
        </div>

        <div className="mx-auto max-w-xl">
          <BirthYearSliderCore min={birthYearMin} max={birthYearMax} isLoading={isLoading}
            onChange={changeYears} onPreview={(min, max) => setPreview({ min, max })} />
        </div>

        {(offMap.length > 0 || activeCountry || selected.length > 1) && (
          <div role="group" aria-label={t("nationality")} className="flex flex-wrap items-center justify-center gap-2">
            {selected.length > 0 && (
              <button type="button" disabled={isLoading} onClick={() => { onInteraction?.(); handleNationalityChange("all"); }}
                className={chipClass(false)}>
                {t("allCountries")}
              </button>
            )}
            {offMap.length > 0 && <span className="text-xs text-text-tertiary">{t("offMap")}</span>}
            {offMap.map(({ code, count }) => (
              <button key={code} type="button" aria-pressed={activeCountry === code} disabled={isLoading}
                onClick={() => selectCountry(code)} className={chipClass(activeCountry === code)}>
                {getNationality(code)} <span className="tabular-nums text-text-tertiary">{t("figureCount", { count })}</span>
              </button>
            ))}
          </div>
        )}

        <p className="text-center text-[11px] text-text-tertiary">{t("scope")}</p>
      </div>

      {expanded && data && (
        <Modal isOpen onClose={() => setExpanded(false)} title={t("label")} size="full" stickyHeader frame="plain" boxClassName="rounded-panel border border-white/20 bg-bg-main">
          <div className="relative h-[min(65dvh,640px)]">
            <WorldGlobe {...globeProps} className="h-full rounded-none border-0" fillContainer initialZoom={0.48} />
          </div>
        </Modal>
      )}
    </section>
  );
}
