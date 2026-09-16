"use client";

import { useState } from "react";
import { ChevronDown, Search, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { FilterModal } from "@/components/shared/filters";
import { CELEB_CONTENT_PRESENCE } from "@/constants/celebContentPresence";
import { PINNED_TREND_COUNTRIES, TREND_PERIOD_HOURS, type TrendCountry } from "@/constants/trendCountries";
import { useProfessionLabel, useContentTypeLabel, useNationalityLabel, useGenderLabel } from "@/hooks/useFilterLabels";
import { BIRTH_YEAR_MIN, BIRTH_YEAR_MAX } from "@/lib/celeb/birthYearScale";
import { SORT_VALUES, type useCelebFilters } from "./useCelebFilters";
import type { CelebSortBy } from "@/actions/home";
import CelebDetailFiltersModal, { type DetailFilter } from "./CelebDetailFiltersModal";

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
  const [open, setOpen] = useState<DetailFilter | "works" | "sort" | null>(null);

  const hasBirthYear = filters.birthYearMin !== undefined || filters.birthYearMax !== undefined;
  const formatYear = (value: number) => value < 0 ? year("bc", { year: -value }) : String(value);

  /* 차원 칩 — 눌러야 나오던 필터를 윤곽으로 항상 보인다. 각 칩은 상세 모달의 자기 탭을 열고,
     활성 차원은 칩 안의 ×로 곧장 해제된다. 사실·가상의 기본값 '사실'은 명부가 실존만 싣는다는 안내다 */
  const dims: { key: DetailFilter; label: string; value: string; active: boolean; clear: () => void }[] = [
    { key: "profession", label: t("filterProfession"), value: getProfession(filters.profession), active: filters.profession !== "all", clear: () => filters.handleProfessionChange("all") },
    { key: "nationality", label: t("filterNationality"), value: getNationality(filters.nationality), active: filters.nationality !== "all", clear: () => filters.handleNationalityChange("all") },
    { key: "contentType", label: t("filterContent"), value: getContentType(filters.contentType), active: filters.contentType !== "all", clear: () => filters.handleContentTypeChange("all") },
    { key: "gender", label: t("filterGender"), value: getGender(filters.gender), active: filters.gender !== "all", clear: () => filters.handleGenderChange("all") },
    { key: "tier", label: t("filterTier"), value: t(`tier.${filters.tierValue}`), active: filters.tierValue !== "all", clear: () => filters.handleTierValueChange("all") },
    { key: "birthYear", label: t("filterBirthYear"), value: hasBirthYear ? year("range", { min: formatYear(filters.birthYearMin ?? BIRTH_YEAR_MIN), max: formatYear(filters.birthYearMax ?? BIRTH_YEAR_MAX) }) : year("all"), active: hasBirthYear, clear: () => filters.handleBirthYearChange(undefined, undefined) },
    { key: "reality", label: t("filterReality"), value: t(`reality.${filters.realityValue}`), active: filters.realityValue !== "real", clear: () => filters.handleRealityChange("real") },
  ];

  return (
    <div className="mb-6 space-y-3">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-[minmax(14rem,1fr)_auto_auto]">
        <form className="col-span-2 flex min-h-11 items-center rounded-md border border-white/15 bg-white/[0.025] focus-within:border-accent/60 md:col-span-1"
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
      </div>
      <div className="flex flex-wrap gap-1.5 md:gap-2">
        {dims.map((dim) => (
          <div key={dim.key}
            className={`flex items-stretch overflow-hidden rounded-md border text-xs ${dim.active ? "border-accent/50 bg-accent/5" : "border-white/15 bg-white/[0.025]"}`}>
            <button type="button" onClick={() => setOpen(dim.key)} disabled={filters.isLoading}
              aria-label={`${dim.label}: ${dim.value}`} aria-haspopup="dialog"
              className="flex min-h-9 items-center gap-1.5 px-2.5 outline-none hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent disabled:opacity-50">
              <span className={dim.active ? "text-accent/80" : "text-text-secondary"}>{dim.label}</span>
              <span className={`font-medium ${dim.active ? "text-accent" : "text-text-primary"}`}>{dim.value}</span>
            </button>
            {dim.active && (
              <button type="button" disabled={filters.isLoading}
                onClick={() => { onInteraction?.(); dim.clear(); }}
                aria-label={t("compactFilters.remove", { label: `${dim.label}: ${dim.value}` })}
                className="flex items-center border-l border-white/10 px-1.5 text-text-secondary outline-none hover:bg-white/5 hover:text-text-primary focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent disabled:opacity-50">
                <X size={11} aria-hidden />
              </button>
            )}
          </div>
        ))}
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
      {open !== null && open !== "works" && open !== "sort" && (
        <CelebDetailFiltersModal filters={filters} initial={open} onClose={() => setOpen(null)} onInteraction={onInteraction} />
      )}
      {open === "works" && <FilterModal isOpen title={t("filterContentPresence")} current={filters.contentPresence}
        options={CELEB_CONTENT_PRESENCE.map(value => ({ value, label: t(`contentPresence.${value}`) }))}
        onChange={value => { onInteraction?.(); filters.handleContentPresenceChange(value); }} onClose={() => setOpen(null)} />}
      {open === "sort" && <FilterModal isOpen title={t("filterSort")} current={filters.sortBy}
        options={SORT_VALUES.map(value => ({ value, label: t(`sort.${value}`) }))}
        onChange={value => { onInteraction?.(); filters.handleSortChange(value as CelebSortBy); }} onClose={() => setOpen(null)} />}
    </div>
  );
}
