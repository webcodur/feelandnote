"use client";

import { useId, useRef, useState } from "react";
import { ArrowRight, History, Search, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import HubSection from "@/components/shared/HubSection";
import AtlasNavSections from "@/components/shared/atlasNav/AtlasNavSections";
import { filterAtlasCatalog, type AtlasCatalogGroup } from "@/lib/atlas-catalog";
import type { AtlasWorld } from "../myth/atlasNavigationData";
import { MYTH_LAYOUT as layout } from "../myth/mythLayout";
import { SceneCompletionCountBadge } from "../myth/SceneCompletionBadge";
import AtlasCatalogCard from "./AtlasCatalogCard";

export default function AtlasCatalog({ mode, groups, initialTheme, recent }: {
  mode: AtlasWorld;
  groups: AtlasCatalogGroup[];
  initialTheme?: string;
  recent?: { name: string; href: string };
}) {
  const t = useTranslations("explore.atlasCatalog");
  const tScenes = useTranslations("explore.hub.myth");
  const [theme, setTheme] = useState<string | null>(() => groups.some(group => group.id === initialTheme) ? initialTheme! : null);
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const id = useId();
  const resultsId = `${id}-results`;
  const visible = filterAtlasCatalog(groups, theme, query);
  const total = groups.reduce((sum, group) => sum + group.entries.length, 0);
  const count = visible.reduce((sum, group) => sum + group.entries.length, 0);
  const contents = visible.map((group, index) => ({
    key: group.id, label: group.name, chapter: String(index + 1).padStart(2, "0"), sectionId: `atlas-catalog-${group.id}`,
  }));
  const themes = groups.map(group => ({ ...group, completedNames: group.entries.filter(entry => entry.scenesComplete).map(entry => entry.name) }));
  const allCompletedNames = themes.flatMap(group => group.completedNames);
  const filters = [{ id: null, name: t("all"), completedNames: allCompletedNames }, ...themes];
  const optionLabel = (group: typeof filters[number]) => group.completedNames.length
    ? `${group.name} · ${tScenes("scenesCompleteCountShort", { count: group.completedNames.length })}` : group.name;
  return (
    <div data-atlas-catalog={mode} className={layout.shell}>
      <AtlasNavSections items={contents} />
      <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-5 pb-2 pt-6 md:gap-6 md:pt-8">
        <div className="flex w-full flex-wrap items-center justify-between gap-3 text-sm text-text-secondary">
          <div data-atlas-catalog-total className="flex flex-wrap items-center gap-2">
            <p>{t(mode === "myth" ? "mythCount" : "factionCount", { count: total })}</p>
            <SceneCompletionCountBadge names={allCompletedNames} />
          </div>
          {recent && <Link href={recent.href} prefetch={false} data-atlas-continue
            className="inline-flex min-h-11 max-w-full items-center gap-2 rounded-control border border-line-strong px-3 hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
            <History size={14} className="shrink-0" aria-hidden /><span className="shrink-0">{t("continue")}</span><span className="truncate font-medium text-text-primary">{recent.name}</span><ArrowRight size={14} className="shrink-0" aria-hidden />
          </Link>}
        </div>
        <div role="search" className="relative w-full">
          <Search size={18} className="pointer-events-none absolute start-4 top-1/2 -translate-y-1/2 text-text-tertiary" aria-hidden />
          <input ref={searchRef} type="search" value={query} onChange={event => setQuery(event.target.value)} aria-controls={resultsId}
            aria-label={t(mode === "myth" ? "searchMyths" : "searchFactions")} placeholder={t(mode === "myth" ? "searchMyths" : "searchFactions")}
            className="min-h-12 w-full rounded-control border border-line-strong bg-bg-main pe-12 ps-11 text-base text-text-primary outline-none hover:border-accent/50 focus:border-accent focus-visible:ring-2 focus-visible:ring-accent [&::-webkit-search-cancel-button]:appearance-none" />
          {query && <button type="button" onClick={() => { setQuery(""); searchRef.current?.focus({ preventScroll: true }); }} aria-label={t("clearSearch")} className="absolute end-1 top-1 grid size-10 place-items-center rounded-control text-text-secondary hover:bg-accent/10 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"><X size={16} aria-hidden /></button>}
        </div>
        <label className="flex w-full max-w-[420px] flex-col items-center gap-2 text-xs text-text-secondary sm:hidden">
          {t(mode === "myth" ? "regions" : "themes")}
          <select value={theme ?? ""} onChange={event => setTheme(event.target.value || null)} aria-controls={resultsId} data-atlas-catalog-select
            className="min-h-11 w-full rounded-control border border-line-strong bg-bg-main px-4 text-center text-base text-text-primary outline-none hover:border-accent focus-visible:ring-2 focus-visible:ring-accent">
            {filters.map(group => <option key={group.id ?? "all"} value={group.id ?? ""}>{optionLabel(group)}</option>)}
          </select>
        </label>
        <div role="group" aria-label={t(mode === "myth" ? "regions" : "themes")} className="hidden flex-wrap justify-center gap-2 sm:flex">
          {filters.map(group => <button key={group.id ?? "all"} type="button" aria-pressed={theme === group.id} aria-controls={resultsId}
            onClick={() => setTheme(group.id)} data-atlas-catalog-theme={group.id ?? "all"}
            className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-full border px-4 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-accent [@media(pointer:coarse)]:min-h-11 ${theme === group.id ? "border-accent/60 bg-accent/10 text-accent hover:border-accent hover:bg-accent/15" : "border-line-strong text-text-secondary hover:border-accent hover:text-accent"}`}><span>{group.name}</span><SceneCompletionCountBadge names={group.completedNames} /></button>)}
        </div>
        <p role="status" aria-live="polite" aria-atomic="true" className={theme || query ? "text-xs text-text-tertiary" : "sr-only"}>{t("results", { count })}</p>
      </div>
      <div id={resultsId}>
        {visible.map((group, index) => <HubSection key={group.id} id={`atlas-catalog-${group.id}`} title={group.name} index={index} total={visible.length} hideDivider={index === 0}>
          <div className={layout.catalogGrid}>
            {group.entries.map(entry => <AtlasCatalogCard key={entry.id} entry={entry} />)}
          </div>
        </HubSection>)}
        {!visible.length && <div className="py-16 text-center"><p className="text-sm text-text-secondary">{t("empty")}</p><button type="button" onClick={() => { setTheme(null); setQuery(""); }} className="mt-5 min-h-11 rounded-control border border-line-strong px-4 text-sm text-text-primary hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">{t("reset")}</button></div>}
      </div>
    </div>
  );
}
