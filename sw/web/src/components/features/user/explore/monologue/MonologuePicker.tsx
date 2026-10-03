"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { AudioLines, Search, UserRound } from "lucide-react";
import type { VirtualMonologueCeleb } from "@/actions/celebs/getVirtualMonologueCelebs";
import CelebAvatarImage from "@/components/ui/CelebAvatarImage";
import { Pagination } from "@/components/ui/Pagination";
import { cn } from "@/lib/utils";
import { EMPTY_MONOLOGUE_FILTERS, filterMonologueCelebs, monologuePage, type MonologueFilters, type MonologueBrowseOptions } from "./monologueBrowse";

interface Props {
  items: VirtualMonologueCeleb[];
  options: MonologueBrowseOptions;
  selected: VirtualMonologueCeleb | null;
  onSelect: (celeb: VirtualMonologueCeleb) => void;
  onShowSelected: () => void;
}

const selectClass = "min-h-11 w-full rounded-xl border border-white/15 bg-bg-card px-3 text-sm text-text-secondary hover:border-accent/45 outline-none focus-visible:ring-2 focus-visible:ring-accent";

export default function MonologuePicker({ items, options: { professions, nationalities }, selected, onSelect, onShowSelected }: Props) {
  const t = useTranslations("explore.monologue");
  const [filters, setFilters] = useState<MonologueFilters>(EMPTY_MONOLOGUE_FILTERS);
  const [requestedPage, setPage] = useState(1);
  const deferredQuery = useDeferredValue(filters.query);
  const { profession, nationality, audio } = filters;
  const matched = useMemo(() => filterMonologueCelebs(items, { query: deferredQuery, profession, nationality, audio }), [items, deferredQuery, profession, nationality, audio]);
  const { items: visible, page, totalPages } = monologuePage(matched, requestedPage);
  const activeFilters = !!(filters.query || filters.profession || filters.nationality || filters.audio !== "all");
  const changeFilter = <K extends keyof MonologueFilters>(key: K, value: MonologueFilters[K]) => {
    setFilters(previous => ({ ...previous, [key]: value }));
    setPage(1);
  };

  return (
    <div data-monologue-picker>
      <div className="mb-5 space-y-3 md:mb-7">
        <div className="relative">
          <Search size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary" aria-hidden />
          <input type="search" value={filters.query} onChange={event => changeFilter("query", event.target.value)}
            placeholder={t("searchPlaceholder")} aria-label={t("searchPlaceholder")}
            className="min-h-11 w-full rounded-xl border border-white/15 bg-white/[0.035] py-3 pl-11 pr-4 text-sm text-text-primary placeholder:text-text-tertiary hover:border-accent/45 focus:border-accent focus:outline-none" />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <select value={filters.profession} onChange={event => changeFilter("profession", event.target.value)} aria-label={t("professionFilter")} className={selectClass}>
            <option value="">{t("allProfessions")}</option>
            {professions.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
          </select>
          <select value={filters.nationality} onChange={event => changeFilter("nationality", event.target.value)} aria-label={t("nationalityFilter")} className={selectClass}>
            <option value="">{t("allNationalities")}</option>
            {nationalities.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
          </select>
          <select value={filters.audio} onChange={event => changeFilter("audio", event.target.value as MonologueFilters["audio"])} aria-label={t("audioFilter")} className={`${selectClass} col-span-2 sm:col-span-1`}>
            <option value="all">{t("allMonologues")}</option>
            <option value="voiced">{t("withAudio")}</option>
            <option value="text">{t("textOnly")}</option>
          </select>
        </div>
        <div className="flex min-h-8 flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs">
          <p className="tabular-nums text-text-tertiary" aria-live="polite">
            {t("resultCount", { count: matched.length })}
            <span className="ml-3 inline-flex items-center gap-1"><AudioLines size={12} aria-hidden />{t("audioLegend")}</span>
          </p>
          {activeFilters ? <button type="button" onClick={() => { setFilters(EMPTY_MONOLOGUE_FILTERS); setPage(1); }} className="min-h-8 rounded px-2 text-text-secondary hover:bg-white/5 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">{t("resetFilters")}</button> : null}
        </div>
      </div>
      {matched.length === 0 ? (
        <p className="rounded-xl border border-white/10 px-5 py-14 text-center text-sm text-text-secondary">{t("noResults")}</p>
      ) : (
        <>
          <ul className="grid grid-cols-4 gap-x-3 gap-y-5 sm:grid-cols-6 md:grid-cols-8 md:gap-x-5">
            {visible.map(celeb => (
              <li key={celeb.id} className="min-w-0">
                <button type="button" onClick={() => onSelect(celeb)} aria-label={t("openMonologue", { name: celeb.nickname })}
                  aria-pressed={selected?.id === celeb.id} aria-controls="monologue-player" title={`${celeb.nickname} · ${t(celeb.hasVoice ? "withAudio" : "textOnly")}`}
                  className="group flex w-full flex-col items-center gap-2 outline-none">
                  <span className="relative w-full max-w-24">
                    <span className={cn("relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-full border-2 bg-white/[0.035] group-hover:border-accent/70 group-active:bg-accent/10 group-focus-visible:border-accent group-focus-visible:ring-2 group-focus-visible:ring-accent/40", selected?.id === celeb.id ? "border-accent bg-accent/10" : "border-white/10")}>
                      {celeb.avatar_url ? <CelebAvatarImage src={celeb.avatar_url} alt="" draggable={false} /> : <UserRound className="size-8 text-text-tertiary" aria-hidden />}
                    </span>
                    {celeb.hasVoice ? <span className="absolute bottom-0 right-0 rounded-full border border-accent/35 bg-bg-card p-1 text-accent" aria-label={t("withAudio")}><AudioLines size={14} aria-hidden /></span> : null}
                  </span>
                  <span className={cn("line-clamp-2 min-h-8 w-full break-keep break-words text-center text-xs font-medium group-hover:text-accent sm:min-h-10 sm:text-sm", selected?.id === celeb.id ? "text-accent" : "text-text-secondary")}>{celeb.nickname}</span>
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-6"><Pagination presentation="quiet" currentPage={page} totalPages={totalPages} onPageChange={setPage} /></div>
        </>
      )}
      {selected ? <div className="mt-4 flex items-center justify-center">
        <button type="button" onClick={onShowSelected} className="min-h-11 rounded-lg px-3 text-xs text-text-secondary hover:bg-accent/10 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">{t("selectedFigure", { name: selected.nickname })}</button>
      </div> : null}
    </div>
  );
}
