"use client";

import { useState } from "react";
import { ChevronDown, Search, SlidersHorizontal, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { FilterModal } from "@/components/shared/filters";
import { CELEB_CONTENT_PRESENCE } from "@/constants/celebContentPresence";
import { PINNED_TREND_COUNTRIES, TREND_PERIOD_HOURS, type TrendCountry } from "@/constants/trendCountries";
import { useProfessionLabel, useContentTypeLabel, useNationalityLabel, useGenderLabel } from "@/hooks/useFilterLabels";
import { BIRTH_YEAR_MIN, BIRTH_YEAR_MAX } from "@/lib/celeb/birthYearScale";
import { SORT_VALUES, type useCelebFilters } from "./useCelebFilters";
import type { CelebSortBy } from "@/actions/home";
import CelebDetailFiltersModal from "./CelebDetailFiltersModal";

interface Props {
  filters: ReturnType<typeof useCelebFilters>;
  trendCountryOptions?: readonly TrendCountry[];
  onInteraction?: () => void;
}

const controlClass = "flex min-h-11 min-w-0 items-center justify-center gap-1.5 rounded-md border border-white/15 bg-white/[0.025] px-2 py-2 md:px-3 text-sm font-medium text-text-primary hover:border-white/35 hover:bg-white/5 outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50";

export default function CelebCompactControls({ filters, trendCountryOptions = PINNED_TREND_COUNTRIES, onInteraction }: Props) {
  const t = useTranslations("home.ui");
  const year = useTranslations("home.ui.birthYear");
  const getProfession = useProfessionLabel();
  const getNationality = useNationalityLabel();
  const getContentType = useContentTypeLabel();
  const getGender = useGenderLabel();
  const [open, setOpen] = useState<"detail" | "works" | "sort" | null>(null);

  const conditions: { key: string; label: string; clear: () => void }[] = [];
  if (filters.profession !== "all") conditions.push({ key: "profession", label: `${t("filterProfession")}: ${getProfession(filters.profession)}`, clear: () => filters.handleProfessionChange("all") });
  if (filters.nationality !== "all") conditions.push({ key: "nationality", label: `${t("filterNationality")}: ${getNationality(filters.nationality)}`, clear: () => filters.handleNationalityChange("all") });
  if (filters.contentType !== "all") conditions.push({ key: "contentType", label: `${t("filterContent")}: ${getContentType(filters.contentType)}`, clear: () => filters.handleContentTypeChange("all") });
  if (filters.gender !== "all") conditions.push({ key: "gender", label: `${t("filterGender")}: ${getGender(filters.gender)}`, clear: () => filters.handleGenderChange("all") });
  if (filters.tierValue !== "all") conditions.push({ key: "tier", label: `${t("filterTier")}: ${t(`tier.${filters.tierValue}`)}`, clear: () => filters.handleTierValueChange("all") });
  if (filters.birthYearMin !== undefined || filters.birthYearMax !== undefined) {
    const formatYear = (value: number) => value < 0 ? year("bc", { year: -value }) : String(value);
    conditions.push({ key: "birthYear", label: `${t("filterBirthYear")}: ${year("range", { min: formatYear(filters.birthYearMin ?? BIRTH_YEAR_MIN), max: formatYear(filters.birthYearMax ?? BIRTH_YEAR_MAX) })}`, clear: () => filters.handleBirthYearChange(undefined, undefined) });
  }
  // 사실·가상 — '사실'이 명부 기본이라 벗어났을 때만 조건 칩으로 뜬다
  if (filters.realityValue !== "real") conditions.push({ key: "reality", label: `${t("filterReality")}: ${t(`reality.${filters.realityValue}`)}`, clear: () => filters.handleRealityChange("real") });
  // 감상 유무 — 처음부터 걸려 있는 필터(감상 있음)라 기본값이라도 칩으로 띄워 X로 풀 수 있게 한다.
  // 상세 모달 항목이 아니므로 상세 버튼의 건수에는 넣지 않는다.
  const chips = filters.contentPresence === "all" ? conditions
    : [{ key: "contentPresence", label: `${t("filterContentPresence")}: ${t(`contentPresence.${filters.contentPresence}`)}`, clear: () => filters.handleContentPresenceChange("all") }, ...conditions];

  return (
    <div className="mb-6 space-y-3">
      <div className="grid grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)_auto] gap-2 md:grid-cols-[minmax(14rem,1fr)_auto_auto_auto]">
        <form className="col-span-3 flex min-h-11 items-center rounded-md border border-white/15 bg-white/[0.025] focus-within:border-accent/60 md:col-span-1"
          onSubmit={event => { event.preventDefault(); onInteraction?.(); filters.handleSearchSubmit(); }}>
          <input value={filters.search} onChange={event => filters.handleSearchInput(event.target.value)} placeholder={t("searchPlaceholder")}
            aria-label={t("searchPlaceholder")} className="h-full min-w-0 flex-1 bg-transparent px-3 text-sm text-text-primary outline-none placeholder:text-text-secondary/60" />
          {filters.search && (
            <button type="button" onClick={() => { onInteraction?.(); filters.handleSearchClear(); }} aria-label={t("compactFilters.remove", { label: filters.search })}
              className="rounded p-1.5 text-text-secondary hover:bg-white/10 hover:text-text-primary outline-none focus-visible:ring-2 focus-visible:ring-accent"><X size={14} /></button>
          )}
          <button type="submit" disabled={filters.isLoading} aria-label={t("searchButton")}
            className="m-1 flex h-8 w-8 shrink-0 items-center justify-center rounded text-text-secondary hover:bg-white/10 hover:text-text-primary outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50"><Search size={17} /></button>
        </form>
        <button type="button" onClick={() => setOpen("works")} disabled={filters.isLoading}
          aria-label={`${t("filterContentPresence")}: ${t(`contentPresence.${filters.contentPresence}`)}`} aria-haspopup="dialog" className={controlClass}>
          <span className="min-w-0 break-words leading-5">{t(`compactFilters.works.${filters.contentPresence}`)}</span><ChevronDown size={13} className="hidden shrink-0 text-text-secondary md:block" />
        </button>
        <button type="button" onClick={() => setOpen("sort")} disabled={filters.isLoading}
          aria-label={`${t("filterSort")}: ${t(`sort.${filters.sortBy}`)}`} aria-haspopup="dialog" className={controlClass}>
          <span className="min-w-0 break-words leading-5">{t(`sort.${filters.sortBy}`)}</span><ChevronDown size={13} className="hidden shrink-0 text-text-secondary md:block" />
        </button>
        <button type="button" onClick={() => setOpen("detail")} aria-haspopup="dialog" className={controlClass}>
          <SlidersHorizontal size={15} /><span>{t("compactFilters.open")}</span>
          {conditions.length > 0 && <span className="text-xs tabular-nums text-accent">{conditions.length}</span>}
        </button>
      </div>
      {filters.sortBy === "country_trending" && (
        <div className="space-y-2 rounded-md border border-white/10 px-3 py-2.5">
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label={t("trends.country")}>
            <span className="mr-1 text-xs text-text-secondary">{t("trends.country")}</span>
            {trendCountryOptions.map(country => (
              <button key={country} type="button" disabled={filters.isLoading} aria-pressed={filters.trendCountry === country}
                onClick={() => { onInteraction?.(); filters.handleTrendCountryChange(country); }}
                className={`min-h-11 rounded px-3 py-1.5 text-xs outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50 ${filters.trendCountry === country ? "bg-accent/10 text-accent hover:bg-accent/20" : "text-text-secondary hover:bg-white/5 hover:text-text-primary"}`}>
                {getNationality(country)}
              </button>
            ))}
          </div>
          <p className="text-xs leading-5 text-text-secondary" role="status">
            {filters.isLoading ? t("trends.loading")
              : !filters.trend?.available ? t("trends.unavailable")
              : filters.trend.matchedCount === 0 ? t("trends.noMatches")
              : t("trends.description", { country: getNationality(filters.trendCountry) })}
          </p>
          <a href={`https://trends.google.com/trending?geo=${filters.trendCountry}&hl=en&hours=${TREND_PERIOD_HOURS}`}
            target="_blank" rel="noopener noreferrer"
            className="inline-flex min-h-9 items-center rounded text-xs text-text-secondary underline decoration-white/20 underline-offset-4 hover:text-accent hover:decoration-accent outline-none focus-visible:ring-2 focus-visible:ring-accent">
            {t("trends.source", { days: TREND_PERIOD_HOURS / 24 })}
          </a>
        </div>
      )}
      {chips.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {chips.map(condition => (
            <button key={condition.key} type="button" disabled={filters.isLoading} onClick={() => { onInteraction?.(); condition.clear(); }}
              aria-label={t("compactFilters.remove", { label: condition.label })}
              className="flex items-center gap-1.5 rounded-full bg-white/5 px-2.5 py-1 text-xs text-text-secondary hover:bg-white/10 hover:text-text-primary outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50">
              {condition.label}<X size={12} aria-hidden />
            </button>
          ))}
        </div>
      )}
      {open === "detail" && <CelebDetailFiltersModal filters={filters} onClose={() => setOpen(null)} onInteraction={onInteraction} />}
      {open === "works" && <FilterModal isOpen title={t("filterContentPresence")} current={filters.contentPresence}
        options={CELEB_CONTENT_PRESENCE.map(value => ({ value, label: t(`contentPresence.${value}`) }))}
        onChange={value => { onInteraction?.(); filters.handleContentPresenceChange(value); }} onClose={() => setOpen(null)} />}
      {open === "sort" && <FilterModal isOpen title={t("filterSort")} current={filters.sortBy}
        options={SORT_VALUES.map(value => ({ value, label: t(`sort.${value}`) }))}
        onChange={value => { onInteraction?.(); filters.handleSortChange(value as CelebSortBy); }} onClose={() => setOpen(null)} />}
    </div>
  );
}
