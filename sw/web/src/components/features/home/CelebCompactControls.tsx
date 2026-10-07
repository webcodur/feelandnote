"use client";

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { ArrowDownWideNarrow, ChevronDown, Info, PenLine, SlidersHorizontal, X } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { FilterModal } from "@/components/shared/filters";
import { CELEB_CONTENT_PRESENCE } from "@/constants/celebContentPresence";
import { DEFAULT_EXPLORE_SORT } from "@/constants/celebSort";
import { TREND_COUNTRIES, TREND_PERIOD_HOURS, parseTrendCountry } from "@/constants/trendCountries";
import { useNationalityLabel } from "@/hooks/useFilterLabels";
import { useCelebDetailConditions } from "./useCelebDetailConditions";
import { SORT_VALUES, type useCelebFilters } from "./useCelebFilters";
import type { CelebSortBy } from "@/actions/home";
import CelebDetailFiltersModal from "./CelebDetailFiltersModal";
import ExploreSearchControls, { EXPLORE_CONTROL_CHANGED_CLASS, EXPLORE_CONTROL_CLASS as controlClass, EXPLORE_PANEL_CLASS } from "@/components/shared/ExploreSearchControls";

const Modal = dynamic(() => import("@/components/ui/Modal"));

interface Props {
  filters: ReturnType<typeof useCelebFilters>;
  onInteraction?: () => void;
  /** 결과 수 문구 — 주면 조작 아래 한 줄에 검색 급증 안내와 나란히 선다 */
  resultLabel?: string;
}

export default function CelebCompactControls({ filters, onInteraction, resultLabel }: Props) {
  const t = useTranslations("home.ui");
  const getNationality = useNationalityLabel();
  const locale = useLocale();
  const [open, setOpen] = useState<"detail" | "works" | "sort" | "trendInfo" | "trendCountry" | null>(null);
  const allCountryOptions = useMemo(
    () => open !== "trendCountry" ? [] : TREND_COUNTRIES.map(value => ({ value: value as string, label: getNationality(value) }))
      .sort((a, b) => a.label.localeCompare(b.label, locale)),
    [open, getNationality, locale],
  );

  const conditions = useCelebDetailConditions(filters);
  // 리뷰 유무는 바로 위 선택 버튼이 현재 값을 보여준다. 상세 조건만 칩으로 남긴다.
  const chips = conditions;
  // 오늘의 추천에 섞인 급상승 인물 — 카드의 화염 표지가 곧 근거이고, 이 줄이 그 해설이다
  const dailyTrendHits = filters.sortBy === "daily_recommend"
    ? filters.celebs.reduce((hit, celeb) => hit + (celeb.trend_match ? 1 : 0), 0)
    : 0;

  return (
    <div className={EXPLORE_PANEL_CLASS}>
      <ExploreSearchControls value={filters.search} placeholder={t("searchPlaceholder")} searchLabel={t("searchButton")}
        clearLabel={t("compactFilters.remove", { label: filters.search })} disabled={filters.isLoading}
        onChange={filters.handleSearchInput} onSubmit={() => { onInteraction?.(); filters.handleSearchSubmit(); }}
        onClear={() => { onInteraction?.(); filters.handleSearchClear(); }}>
        <button type="button" onClick={() => setOpen("works")} disabled={filters.isLoading}
          aria-label={`${t("filterContentPresence")}: ${t(`contentPresence.${filters.contentPresence}`)}`} aria-haspopup="dialog"
          title={`${t("filterContentPresence")}: ${t(`contentPresence.${filters.contentPresence}`)}`}
          className={`${controlClass} ${filters.contentPresence === "all" ? "" : EXPLORE_CONTROL_CHANGED_CLASS}`}>
          <PenLine size={15} className="hidden shrink-0 sm:block" aria-hidden />
          <span className="min-w-0 truncate leading-5">{t(`compactFilters.reviews.${filters.contentPresence}`)}</span>
          {/* ▾ — 누르면 고르는 창이 열리는 선택 단추임을 알린다 */}
          <ChevronDown size={14} className="shrink-0 text-text-tertiary" aria-hidden />
        </button>
        {/* 정렬 — 기본값이 아니면 오른쪽에 되돌리기(X) 칸이 붙는다. 두 칸이 한 단추처럼 보이게 테두리를 바깥 틀이 쥔다 */}
        <div className={`flex min-h-11 min-w-0 items-stretch rounded-control border bg-bg-card text-sm font-medium ${filters.sortBy === DEFAULT_EXPLORE_SORT ? "border-line text-text-primary hover:border-line-strong" : "border-accent/45 text-accent hover:border-accent/70"}`}>
          <button type="button" disabled={filters.isLoading} onClick={() => setOpen("sort")}
            aria-label={`${t("filterSort")}: ${t(`sort.${filters.sortBy}`)}`} aria-haspopup="dialog"
            title={`${t("filterSort")}: ${t(`sort.${filters.sortBy}`)}`}
            className={`flex min-w-0 flex-1 items-center justify-center gap-1.5 px-3 hover:bg-bg-raised outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50 ${filters.sortBy === DEFAULT_EXPLORE_SORT ? "rounded-control" : "rounded-s-control"}`}>
            <ArrowDownWideNarrow size={15} className="hidden shrink-0 sm:block" aria-hidden />
            <span className="min-w-0 truncate leading-5">{t(`sort.${filters.sortBy}`)}</span>
            <ChevronDown size={14} className="shrink-0 text-text-tertiary" aria-hidden />
          </button>
          {filters.sortBy !== DEFAULT_EXPLORE_SORT && (
            <button type="button" disabled={filters.isLoading}
              onClick={() => { onInteraction?.(); filters.handleSortChange(DEFAULT_EXPLORE_SORT); }}
              aria-label={t("compactFilters.remove", { label: `${t("filterSort")}: ${t(`sort.${filters.sortBy}`)}` })}
              className="flex min-w-9 items-center justify-center rounded-e-control border-s border-line px-1.5 hover:bg-bg-raised outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50">
              <X size={13} aria-hidden />
            </button>
          )}
        </div>
        <button type="button" onClick={() => setOpen("detail")} aria-haspopup="dialog" className={controlClass}>
          <SlidersHorizontal size={15} /><span>{t("compactFilters.open")}</span>
          {conditions.length > 0 && <span className="text-xs tabular-nums text-accent">{conditions.length}</span>}
        </button>
      </ExploreSearchControls>
      {filters.sortBy === "country_trending" && (
        <div className="space-y-2 border-t border-line px-1 pt-2">
          <div className="flex flex-wrap items-center justify-center gap-2" role="group" aria-label={t("trends.country")}>
            <button type="button" onClick={() => setOpen("trendInfo")} aria-haspopup="dialog"
              className="mr-1 min-h-11 rounded text-xs text-text-secondary underline decoration-white/30 underline-offset-4 hover:text-accent hover:decoration-accent outline-none focus-visible:ring-2 focus-visible:ring-accent">
              {t("trends.country")}
            </button>
            <button type="button" disabled={filters.isLoading} onClick={() => setOpen("trendCountry")} aria-haspopup="dialog"
              aria-label={`${t("trends.country")}: ${getNationality(filters.trendCountry)}`}
              className="flex min-h-11 items-center gap-1.5 rounded-control border border-line bg-bg-card px-3 py-1.5 text-sm text-text-primary outline-none hover:border-line-strong hover:bg-bg-raised focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50">
              {getNationality(filters.trendCountry)}<ChevronDown size={14} aria-hidden />
            </button>
          </div>
          {(filters.isLoading || !filters.trend?.available || filters.trend.matchedCount === 0) && (
            <p className="text-xs leading-5 text-text-secondary" role="status">
              {filters.isLoading ? t("trends.loading")
                : !filters.trend?.available ? t("trends.unavailable")
                : t("trends.noMatches")}
            </p>
          )}
          {!filters.isLoading && filters.trend?.available && filters.trend.matchedCount > 0 && (
            <ul className="space-y-1 text-xs text-text-secondary">
              <li className="flex items-center gap-2">
                <Info size={12} className="shrink-0" aria-hidden />
                <span>{t("trends.legendDirect", { count: filters.trend.matchedCount })}</span>
              </li>
            </ul>
          )}
        </div>
      )}
      {/* 적용한 상세 조건 — 결과 수 줄과 같이 가운데로 모은다. 누르면 그 조건만 푼다 */}
      {chips.length > 0 && (
        <div className="flex flex-wrap justify-center gap-2">
          {chips.map(condition => (
            <button key={condition.key} type="button" disabled={filters.isLoading} onClick={() => {
              onInteraction?.();
              condition.clear();
            }}
              aria-label={t("compactFilters.remove", { label: condition.label })}
              className="flex min-h-9 items-center gap-1.5 rounded-full border border-line bg-bg-raised px-3 text-xs text-text-secondary hover:border-line-strong hover:text-text-primary outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50">
              {condition.label}<X size={12} aria-hidden />
            </button>
          ))}
        </div>
      )}
      {/* 결과 수와 검색 급증 안내를 한 줄에 둔다 — 둘 다 "지금 보이는 명단"에 대한 설명이다 */}
      {(resultLabel || dailyTrendHits > 0) && (
        <div className="flex flex-wrap items-center justify-center gap-x-2 text-xs text-text-secondary">
          {resultLabel && <p role="status" className="tabular-nums">{resultLabel}</p>}
          {/* 좁은 화면은 두 줄로 나뉘므로 가운뎃점을 숨긴다 — 줄 끝에 점만 남지 않게 */}
          {resultLabel && dailyTrendHits > 0 && <span aria-hidden className="hidden text-text-tertiary sm:inline">·</span>}
          {dailyTrendHits > 0 && (
            <button type="button" onClick={() => setOpen("trendInfo")} aria-haspopup="dialog" aria-label={t("trends.dailyInfoOpen")}
              className="flex min-h-9 items-center gap-1 rounded-control px-1 text-text-secondary hover:bg-white/5 hover:text-text-primary outline-none focus-visible:ring-2 focus-visible:ring-accent">
              <Info size={13} className="shrink-0" aria-hidden />
              <span className="min-w-0 underline decoration-line-strong underline-offset-4">{t("trends.dailyNotice", { count: dailyTrendHits })}</span>
            </button>
          )}
        </div>
      )}
      {open === "detail" && <CelebDetailFiltersModal filters={filters} onClose={() => setOpen(null)} onInteraction={onInteraction} />}
      {open === "works" && <FilterModal isOpen title={t("filterContentPresence")} current={filters.contentPresence}
        options={CELEB_CONTENT_PRESENCE.map(value => ({ value, label: t(`contentPresence.${value}`) }))}
        onChange={value => { onInteraction?.(); filters.handleContentPresenceChange(value); }} onClose={() => setOpen(null)} />}
      {open === "sort" && <FilterModal isOpen title={t("filterSort")} current={filters.sortBy}
        options={SORT_VALUES.map(value => ({ value, label: t(`sort.${value}`) }))}
        onChange={value => { onInteraction?.(); filters.handleSortChange(value as CelebSortBy); }} onClose={() => setOpen(null)} />}
      {open === "trendCountry" && <FilterModal isOpen title={t("trends.allCountries")} current={filters.trendCountry}
        options={allCountryOptions} searchable searchPlaceholder={t("trends.searchCountry")}
        onChange={value => { const country = parseTrendCountry(value); if (country) { onInteraction?.(); filters.handleTrendCountryChange(country); } }} onClose={() => setOpen(null)} />}
      {open === "trendInfo" && (
        <Modal isOpen onClose={() => setOpen(null)} title={filters.sortBy === "daily_recommend" ? t("trends.dailyInfoTitle") : t("trends.country")} size="sm" animateHeight={false}>
          <div className="space-y-4 p-6 text-sm leading-relaxed">
            <p className="text-text-secondary">
              {filters.sortBy === "daily_recommend"
                ? t("trends.dailyInfoBody", { days: TREND_PERIOD_HOURS / 24, country: getNationality(filters.trendCountry) })
                : t("trends.modalDescription", { days: TREND_PERIOD_HOURS / 24 })}
            </p>
            <a href={`https://trends.google.com/trending?geo=${filters.trendCountry}&hl=en&hours=${TREND_PERIOD_HOURS}`}
              target="_blank" rel="noopener noreferrer"
              className="inline-flex min-h-9 items-center rounded text-accent underline underline-offset-4 hover:text-accent-hover outline-none focus-visible:ring-2 focus-visible:ring-accent">
              {t("trends.sourceLink")}
            </a>
          </div>
        </Modal>
      )}
    </div>
  );
}
