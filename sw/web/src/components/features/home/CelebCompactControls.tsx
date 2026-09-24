"use client";

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { ChevronDown, Funnel, Info, PenLine, Search, SlidersHorizontal, X } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { TREND_CHIP_BASE, TREND_CHIP_DIRECT, TREND_CHIP_FLAME_BG } from "@/components/shared/CelebCard.styles";
import { FilterModal } from "@/components/shared/filters";
import { CELEB_CONTENT_PRESENCE } from "@/constants/celebContentPresence";
import { DEFAULT_EXPLORE_SORT } from "@/constants/celebSort";
import { PINNED_TREND_COUNTRIES, TREND_COUNTRIES, TREND_PERIOD_HOURS, parseTrendCountry, type TrendCountry } from "@/constants/trendCountries";
import { useProfessionLabel, useContentTypeLabel, useNationalityLabel, useGenderLabel } from "@/hooks/useFilterLabels";
import { BIRTH_YEAR_MIN, BIRTH_YEAR_MAX } from "@/lib/celeb/birthYearScale";
import { SORT_VALUES, type useCelebFilters } from "./useCelebFilters";
import type { CelebSortBy } from "@/actions/home";
import CelebDetailFiltersModal from "./CelebDetailFiltersModal";

const Modal = dynamic(() => import("@/components/ui/Modal"));

interface Props {
  filters: ReturnType<typeof useCelebFilters>;
  trendCountryOptions?: readonly TrendCountry[];
  onInteraction?: () => void;
}

const controlClass = "flex min-h-11 min-w-0 items-center justify-center gap-1.5 rounded-md border border-white/15 bg-white/[0.025] px-2 py-2 md:px-3 text-sm font-medium text-text-primary hover:border-white/35 hover:bg-white/5 outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50";

export default function CelebCompactControls({ filters, trendCountryOptions = PINNED_TREND_COUNTRIES, onInteraction }: Props) {
  const t = useTranslations("home.ui");
  const tCeleb = useTranslations("shared.celeb");
  const year = useTranslations("home.ui.birthYear");
  const getProfession = useProfessionLabel();
  const getNationality = useNationalityLabel();
  const getContentType = useContentTypeLabel();
  const getGender = useGenderLabel();
  const locale = useLocale();
  const [open, setOpen] = useState<"detail" | "works" | "sort" | "trendInfo" | "trendCountry" | null>(null);
  // 고른 국가가 빠른 버튼에 없으면 끝에 붙인다 — getTrendCountryOptions의 공유 URL 규칙과 같다
  const visibleCountries = trendCountryOptions.includes(filters.trendCountry)
    ? trendCountryOptions
    : [...trendCountryOptions, filters.trendCountry];
  const allCountryOptions = useMemo(
    () => TREND_COUNTRIES.map(value => ({ value: value as string, label: getNationality(value) }))
      .sort((a, b) => a.label.localeCompare(b.label, locale)),
    [getNationality, locale],
  );

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
  // 감상 유무 — 기본으로 걸린 조건도 칩에서 해제할 수 있게 한다.
  // 상세 모달 항목이 아니므로 상세 버튼의 건수에는 넣지 않는다.
  const chips = filters.contentPresence === "all" ? conditions
    : [{ key: "contentPresence", label: `${t("filterContentPresence")}: ${t(`contentPresence.${filters.contentPresence}`)}`, clear: () => filters.handleContentPresenceChange("all") }, ...conditions];
  // 오늘의 추천에 섞인 급상승 인물 — 카드의 화염 표지가 곧 근거이고, 이 줄이 그 해설이다
  const dailyTrendHits = filters.sortBy === "daily_recommend"
    ? filters.celebs.reduce((hit, celeb) => hit + (celeb.trend_match ? 1 : 0), 0)
    : 0;

  return (
    <div className="mb-6 space-y-3">
      <div className="flex flex-wrap gap-2">
        <form className="flex min-h-11 min-w-0 flex-1 basis-full items-center rounded-md border border-white/15 bg-white/[0.025] focus-within:border-accent/60 md:min-w-56 md:basis-auto"
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
          aria-label={`${t("filterContentPresence")}: ${t(`contentPresence.${filters.contentPresence}`)}`} aria-haspopup="dialog"
          title={`${t("filterContentPresence")}: ${t(`contentPresence.${filters.contentPresence}`)}`}
          className={`flex min-h-11 min-w-0 items-center justify-center gap-1.5 rounded-md border px-2 py-2 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50 md:px-3 ${filters.contentPresence === "all" ? "border-white/15 bg-white/[0.025] text-text-primary hover:border-white/35 hover:bg-white/5" : "border-accent/45 bg-accent/10 text-accent hover:bg-accent/20"}`}>
          <PenLine size={15} className="shrink-0" aria-hidden />
          <span className="min-w-0 truncate leading-5">{t(`contentPresence.${filters.contentPresence}`)}</span>
        </button>
        <div className={`flex min-h-11 min-w-0 items-stretch rounded-md border text-sm ${filters.sortBy === DEFAULT_EXPLORE_SORT ? "border-white/15 bg-white/[0.025] text-text-primary" : "border-accent/45 bg-accent/10 text-accent"}`}>
          <button type="button" disabled={filters.isLoading} onClick={() => setOpen("sort")}
            aria-label={`${t("filterSort")}: ${t(`sort.${filters.sortBy}`)}`} aria-haspopup="dialog"
            title={`${t("filterSort")}: ${t(`sort.${filters.sortBy}`)}`}
            className={`flex min-w-0 flex-1 items-center justify-center gap-1.5 px-2 py-1 hover:bg-white/10 hover:text-text-primary outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50 md:px-3 ${filters.sortBy === DEFAULT_EXPLORE_SORT ? "rounded-md" : "rounded-l-md"}`}>
            <Funnel size={15} className="shrink-0" aria-hidden />
            <span className="min-w-0 truncate leading-5">{t(`sort.${filters.sortBy}`)}</span>
          </button>
          {filters.sortBy !== DEFAULT_EXPLORE_SORT && (
            <button type="button" disabled={filters.isLoading}
              onClick={() => { onInteraction?.(); filters.handleSortChange(DEFAULT_EXPLORE_SORT); }}
              aria-label={t("compactFilters.remove", { label: `${t("filterSort")}: ${t(`sort.${filters.sortBy}`)}` })}
              className="flex min-w-8 items-center justify-center rounded-r-md border-l border-white/10 px-1.5 hover:bg-accent/20 outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50">
              <X size={12} aria-hidden />
            </button>
          )}
        </div>
        <button type="button" onClick={() => setOpen("detail")} aria-haspopup="dialog" className={`${controlClass} shrink-0`}>
          <SlidersHorizontal size={15} /><span>{t("compactFilters.open")}</span>
          {conditions.length > 0 && <span className="text-xs tabular-nums text-accent">{conditions.length}</span>}
        </button>
      </div>
      {filters.sortBy === "country_trending" && (
        <div className="space-y-2 rounded-md border border-white/10 px-3 py-2.5">
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label={t("trends.country")}>
            <button type="button" onClick={() => setOpen("trendInfo")} aria-haspopup="dialog"
              className="mr-1 min-h-11 rounded text-xs text-text-secondary underline decoration-white/30 underline-offset-4 hover:text-accent hover:decoration-accent outline-none focus-visible:ring-2 focus-visible:ring-accent">
              {t("trends.country")}
            </button>
            {visibleCountries.map(country => (
              <button key={country} type="button" disabled={filters.isLoading} aria-pressed={filters.trendCountry === country}
                onClick={() => { onInteraction?.(); filters.handleTrendCountryChange(country); }}
                className={`min-h-11 rounded px-3 py-1.5 text-xs outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50 ${filters.trendCountry === country ? "bg-accent/10 text-accent hover:bg-accent/20" : "text-text-secondary hover:bg-white/5 hover:text-text-primary"}`}>
                {getNationality(country)}
              </button>
            ))}
            <button type="button" disabled={filters.isLoading} onClick={() => setOpen("trendCountry")} aria-haspopup="dialog"
              className="flex min-h-11 items-center gap-1 rounded px-2.5 py-1.5 text-xs text-text-secondary outline-none hover:bg-white/5 hover:text-text-primary focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50">
              {t("trends.more")}<ChevronDown size={12} aria-hidden />
            </button>
          </div>
          {(filters.isLoading || !filters.trend?.available || filters.trend.matchedCount === 0) && (
            <p className="text-xs leading-5 text-text-secondary" role="status">
              {filters.isLoading ? t("trends.loading")
                : !filters.trend?.available ? t("trends.unavailable")
                : t("trends.noMatches")}
            </p>
          )}
          {/* 칩 범례 — 카드·명부의 네모 칩과 같은 모양으로 급상승 표지를 설명한다 */}
          {!filters.isLoading && filters.trend?.available && filters.trend.matchedCount > 0 && (
            <ul className="space-y-1 text-xs text-text-secondary">
              <li className="flex items-center gap-2">
                <span className={`${TREND_CHIP_BASE} ${TREND_CHIP_DIRECT}`} style={{ background: TREND_CHIP_FLAME_BG }}>{tCeleb("trendChipSurge")}</span>
                <span>{t("trends.legendDirect", { count: filters.trend.matchedCount })}</span>
              </li>
            </ul>
          )}
        </div>
      )}
      {dailyTrendHits > 0 && (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md border border-orange-400/25 bg-orange-500/[0.05] px-3 py-2">
          <span className={`${TREND_CHIP_BASE} ${TREND_CHIP_DIRECT}`} style={{ background: TREND_CHIP_FLAME_BG }}>{tCeleb("trendChipSurge")}</span>
          <span className="text-xs leading-5 text-text-secondary">{t("trends.dailyNotice", { count: dailyTrendHits })}</span>
          <button type="button" onClick={() => setOpen("trendInfo")} aria-haspopup="dialog" aria-label={t("trends.dailyInfoOpen")}
            className="ml-auto flex min-h-6 min-w-6 items-center justify-center rounded text-text-secondary hover:bg-white/10 hover:text-text-primary outline-none focus-visible:ring-2 focus-visible:ring-accent">
            <Info size={13} aria-hidden />
          </button>
        </div>
      )}
      {chips.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {chips.map(condition => (
            <button key={condition.key} type="button" disabled={filters.isLoading} onClick={() => {
              onInteraction?.();
              condition.clear();
            }}
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
