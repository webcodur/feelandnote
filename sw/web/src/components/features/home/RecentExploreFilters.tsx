"use client";

import { ChevronDown, ChevronUp, Power, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useContentTypeLabel, useGenderLabel, useNationalityLabel, useProfessionLabel } from "@/hooks/useFilterLabels";
import type { useCelebFilters } from "./useCelebFilters";
import { EXPLORE_FILTER_HISTORY_LIMITS, normalizeExploreFilterHistoryLimit } from "@/lib/explorePreferences";

export default function RecentExploreFilters({ filters, onInteraction }: {
  filters: ReturnType<typeof useCelebFilters>;
  onInteraction?: () => void;
}) {
  const t = useTranslations("home.ui");
  const year = useTranslations("home.ui.birthYear");
  const profession = useProfessionLabel();
  const nationality = useNationalityLabel();
  const contentType = useContentTypeLabel();
  const gender = useGenderLabel();
  const commitLimit = (input: HTMLInputElement) => {
    const limit = input.value.trim() ? normalizeExploreFilterHistoryLimit(input.value) : filters.recentFiltersLimit;
    input.value = String(limit);
    filters.handleRecentFiltersLimitChange(limit);
  };

  const label = (entry: string) => {
    const saved = new URLSearchParams(entry);
    const value = (key: string) => saved.get(key)!;
    if (saved.has("profession")) return `${t("filterProfession")}: ${profession(value("profession"))}`;
    if (saved.has("nationality")) return `${t("filterNationality")}: ${nationality(value("nationality"))}`;
    if (saved.has("contentType")) return `${t("filterContent")}: ${contentType(value("contentType"))}`;
    if (saved.has("contentPresence")) return t(`compactFilters.reviews.${value("contentPresence")}`);
    if (saved.has("gender")) return `${t("filterGender")}: ${gender(value("gender"))}`;
    if (saved.has("reality")) {
      const values = value("reality").split(",");
      const reality = values.length === 1 && values[0] === "BOTH" ? "mixed"
        : values.includes("REAL") && values.includes("FICTION") ? "all" : values.includes("FICTION") ? "fiction" : "real";
      return `${t("filterReality")}: ${t(`reality.${reality}`)}`;
    }
    if (saved.has("byMin") || saved.has("byMax")) {
      const format = (value: number) => value < 0 ? year("bc", { year: -value }) : String(value);
      const label = !saved.has("byMin") ? year("toYear", { year: format(Number(value("byMax"))) })
        : !saved.has("byMax") ? year("fromYear", { year: format(Number(value("byMin"))) })
        : year("range", { min: format(Number(value("byMin"))), max: format(Number(value("byMax"))) });
      return `${t("filterBirthYear")}: ${label}`;
    }
    return "";
  };

  return (
    <div className="space-y-3 rounded-control border border-line bg-bg-card/40 p-3" role="group" aria-label={t("recentFilters.title")}>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 text-xs text-text-secondary">
        <div className="flex items-center gap-2">
        <p>{t("recentFilters.title")}</p>
        <div className="flex h-9 items-stretch overflow-hidden rounded-control border border-line bg-bg-card" title={t("recentFilters.limit")}>
          <input key={filters.recentFiltersLimit} type="number" data-recent-filter-limit
            aria-label={t("recentFilters.limit")} min={EXPLORE_FILTER_HISTORY_LIMITS.min} max={EXPLORE_FILTER_HISTORY_LIMITS.max} step={1} inputMode="numeric"
            defaultValue={filters.recentFiltersLimit} disabled={!filters.recentFiltersReady}
            onBlur={event => commitLimit(event.currentTarget)}
            onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); commitLimit(event.currentTarget); } }}
            className="w-10 appearance-none bg-transparent px-1 text-center tabular-nums text-text-primary outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent disabled:opacity-30 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" />
          <div className="flex w-6 flex-col border-s border-line">
            <button type="button" aria-label={t("recentFilters.increaseLimit")} disabled={!filters.recentFiltersReady || filters.recentFiltersLimit >= EXPLORE_FILTER_HISTORY_LIMITS.max}
              onClick={() => filters.handleRecentFiltersLimitChange(filters.recentFiltersLimit + 1)}
              className="flex flex-1 items-center justify-center border-b border-line hover:bg-white/5 hover:text-accent outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent disabled:opacity-30"><ChevronUp size={12} aria-hidden /></button>
            <button type="button" aria-label={t("recentFilters.decreaseLimit")} disabled={!filters.recentFiltersReady || filters.recentFiltersLimit <= EXPLORE_FILTER_HISTORY_LIMITS.min}
              onClick={() => filters.handleRecentFiltersLimitChange(filters.recentFiltersLimit - 1)}
              className="flex flex-1 items-center justify-center hover:bg-white/5 hover:text-accent outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent disabled:opacity-30"><ChevronDown size={12} aria-hidden /></button>
          </div>
        </div>
        </div>
        <div className="flex items-center gap-2">
        <button type="button" aria-label={t("recentFilters.clearAll")} title={t("recentFilters.clearAll")}
          disabled={!filters.recentFiltersReady || !filters.recentFilters.length}
          onClick={filters.clearRecentFilters}
          className="flex size-9 shrink-0 items-center justify-center rounded-control border border-line text-text-secondary hover:border-line-strong hover:bg-white/5 hover:text-accent outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-default disabled:opacity-30">
          <X size={14} aria-hidden />
        </button>
        <button type="button" role="switch" aria-checked={filters.recentFiltersEnabled}
          aria-label={t("recentFilters.toggle")} title={t(filters.recentFiltersEnabled ? "recentFilters.disable" : "recentFilters.enable")}
          disabled={!filters.recentFiltersReady} onClick={() => filters.handleRecentFiltersEnabledChange(!filters.recentFiltersEnabled)}
          className={`flex size-9 shrink-0 items-center justify-center rounded-control border outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-30 ${filters.recentFiltersEnabled ? "border-accent/35 bg-accent/5 text-accent hover:border-accent/70 hover:bg-accent/15" : "border-line text-text-tertiary hover:border-line-strong hover:bg-white/5 hover:text-text-secondary"}`}>
          <Power size={14} aria-hidden />
        </button>
        </div>
      </div>
      {filters.recentFiltersEnabled && filters.recentFilters.length > 0 && <div className="flex flex-wrap gap-2">
        {filters.recentFilters.map(entry => {
          const description = label(entry);
          const current = filters.currentFilterEntries.includes(entry);
          return (
            <div key={entry} className={`flex max-w-full min-w-0 items-stretch rounded-control border text-xs ${current ? "border-accent/35 bg-accent/5 text-accent" : "border-line text-text-secondary"}`}>
              <button type="button" disabled={filters.isLoading} aria-pressed={current} title={description}
                aria-label={t("recentFilters.apply", { label: description })}
                onClick={() => { onInteraction?.(); filters.handleRecentFilterApply(entry); }}
                className="min-h-9 min-w-0 rounded-s-control px-3 py-2 text-left hover:bg-accent/10 hover:text-accent outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50">
                <span className="line-clamp-2 break-words">{description}</span>
              </button>
              <button type="button" aria-label={t("recentFilters.remove", { label: description })}
                onClick={() => filters.removeRecentFilter(entry)}
                className="flex min-w-9 shrink-0 items-center justify-center rounded-e-control border-s border-line px-2 hover:bg-accent/10 hover:text-accent outline-none focus-visible:ring-2 focus-visible:ring-accent">
                <X size={12} aria-hidden />
              </button>
            </div>
          );
        })}
      </div>}
    </div>
  );
}
