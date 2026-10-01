"use client";

import { useRef, type KeyboardEvent } from "react";
import { ChevronRight, Search, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { atlasStepKeys, type AtlasWorld } from "./atlasNavigationData";

interface Props {
  world: AtlasWorld;
  active: number;
  query: string;
  resultCount: number;
  selectionNames: string[];
  ready: boolean;
  onWorldChange: (world: AtlasWorld) => void;
  onTabChange: (level: number) => void;
  onQueryChange: (value: string) => void;
  onSearchSelect: () => void;
}

export default function AtlasPickerControls({ world, active, query, resultCount, selectionNames, ready, onWorldChange, onTabChange, onQueryChange, onSearchSelect }: Props) {
  const t = useTranslations("explore.ui.atlas");
  const tMyth = useTranslations("explore.hub.myth");
  const tFaction = useTranslations("explore.faction");
  const inputRef = useRef<HTMLInputElement>(null);
  const searching = Boolean(query.trim());
  const kinds = atlasStepKeys(world);
  const worlds = [{ id: "myth" as const, name: t("myth"), label: tMyth("title") }, { id: "faction" as const, name: t("factionMode"), label: tFaction("title") }];
  const clear = () => { onQueryChange(""); inputRef.current?.focus({ preventScroll: true }); };
  const searchKey = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.nativeEvent.isComposing) return;
    if (event.key === "Escape" && query) {
      event.preventDefault();
      event.stopPropagation();
      clear();
    }
    if (event.key === "Enter" && searching) { event.preventDefault(); onSearchSelect(); }
    if (event.key === "ArrowDown") {
      const first = event.currentTarget.closest("[data-atlas-picker]")?.querySelector<HTMLButtonElement>("[data-atlas-panel] button:not([disabled])");
      if (first) { event.preventDefault(); first.focus({ preventScroll: true }); }
    }
  };
  const tabKey = (event: KeyboardEvent<HTMLButtonElement>, level: number) => {
    const targets: Partial<Record<string, number>> = { ArrowRight: (level + 1) % 3, ArrowLeft: (level + 2) % 3, Home: 0, End: 2 };
    const next = targets[event.key];
    if (next === undefined) return;
    event.preventDefault();
    onTabChange(next);
    event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>("button")[next]?.focus({ preventScroll: true });
  };
  return (
    <div className="shrink-0 px-4 pt-4 sm:px-6">
      <div data-atlas-toolbar className="group/atlas-toolbar grid grid-cols-[144px_minmax(0,1fr)] gap-2 transition-[grid-template-columns,gap] duration-200 ease-out motion-reduce:transition-none has-[[data-atlas-search]:focus-within]:grid-cols-[0px_minmax(0,1fr)] has-[[data-atlas-search]:focus-within]:gap-0 sm:grid-cols-[180px_minmax(0,1fr)] sm:has-[[data-atlas-search]:focus-within]:grid-cols-[180px_minmax(0,1fr)] sm:has-[[data-atlas-search]:focus-within]:gap-2">
        <div role="group" aria-label={t("world")} data-atlas-worlds className="grid min-w-0 grid-cols-2 gap-1 overflow-hidden rounded-lg border border-white/10 bg-bg-secondary p-1 group-has-[[data-atlas-search]:focus-within]/atlas-toolbar:invisible sm:group-has-[[data-atlas-search]:focus-within]/atlas-toolbar:visible">
          {worlds.map((item) => <button key={item.id} type="button" aria-label={item.label} title={item.label} aria-pressed={world === item.id} onClick={() => onWorldChange(item.id)}
            className={`flex min-h-9 items-center justify-center whitespace-nowrap rounded-md px-2 text-center text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent ${world === item.id ? "bg-accent/15 text-accent hover:bg-accent/20" : "text-text-secondary hover:bg-white/5 hover:text-text-primary"}`}>
            {item.name}
          </button>)}
        </div>
        <div data-atlas-search onClick={(event) => { if (!(event.target as HTMLElement).closest("button")) inputRef.current?.focus({ preventScroll: true }); }}
          className="group/atlas-search flex min-w-0 items-center gap-2 rounded-lg border border-white/15 bg-bg-secondary px-3 hover:border-white/30 has-[input:focus-visible]:border-accent/70 has-[input:focus-visible]:ring-2 has-[input:focus-visible]:ring-inset has-[input:focus-visible]:ring-accent/30">
          <Search size={16} className="shrink-0 text-text-secondary" aria-hidden />
          <input ref={inputRef} type="search" value={query} onChange={(event) => onQueryChange(event.target.value)} onKeyDown={searchKey}
            aria-label={t(world === "myth" ? "searchMyth" : "searchFaction")} placeholder={t(world === "myth" ? "searchMyth" : "searchFaction")}
            className="min-h-11 min-w-0 flex-1 bg-transparent text-base text-text-primary outline-none placeholder:text-text-tertiary sm:text-sm [&::-webkit-search-cancel-button]:appearance-none" />
          <button type="button" aria-label={t("clearSearch")} onClick={clear} tabIndex={query ? 0 : -1}
            className={`size-9 shrink-0 place-items-center rounded-md text-text-secondary outline-none hover:bg-white/10 hover:text-accent focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent ${query ? "grid visible" : "invisible hidden group-focus-within/atlas-search:grid sm:grid"}`}><X size={15} aria-hidden /></button>
        </div>
      </div>
      {!searching && <div role="tablist" aria-label={t("browseAll")} className="relative mt-4 grid grid-cols-3 border-b border-white/10 [@media(max-height:560px)]:mt-2">
        <span aria-hidden data-atlas-tab-indicator className="pointer-events-none absolute bottom-[-1px] left-0 h-0.5 w-1/3 bg-accent transition-transform duration-200 ease-out motion-reduce:transition-none" style={{ transform: `translateX(${active * 100}%)` }} />
        {[1, 2].map((level) => <ChevronRight key={level} aria-hidden size={12} className={`pointer-events-none absolute top-[18px] -translate-x-1/2 ${level <= active ? "text-accent/60" : "text-text-tertiary"}`} style={{ left: `${level * 100 / 3}%` }} />)}
        {[0, 1, 2].map((level) => <button key={level} type="button" role="tab" id={`atlas-tab-${level}`} data-atlas-tab={level} aria-selected={active === level} aria-controls="atlas-panel" tabIndex={active === level ? 0 : -1} aria-label={`${t(kinds[level])}: ${selectionNames[level]}`} title={selectionNames[level]}
          onClick={() => onTabChange(level)} onKeyDown={(event) => tabKey(event, level)}
          className={`flex min-h-12 min-w-0 items-center justify-center border-b-2 border-transparent px-2 py-3 text-center outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent ${active === level ? "text-accent hover:bg-accent/5" : "text-text-secondary hover:bg-white/5 hover:text-text-primary"}`}>
          <span className="flex items-center gap-2 whitespace-nowrap text-sm font-semibold leading-6">
            <span aria-hidden className={`inline-flex size-5 shrink-0 items-center justify-center rounded-full border text-[10px] leading-none tabular-nums ${active === level ? "border-accent bg-accent text-bg-main" : level < active ? "border-accent/40 bg-accent/10 text-accent" : "border-white/15 text-text-tertiary"}`}>{level + 1}</span>
            {t(kinds[level])}
          </span>
        </button>)}
      </div>}
      {searching && <div className="mt-4 flex min-h-12 items-center justify-between gap-3 border-b border-white/10 [@media(max-height:560px)]:mt-2">
        <p id="atlas-search-results" role="status" className="text-xs font-medium text-text-secondary">{t("searchResults", { count: resultCount })}</p>
        <button type="button" onClick={clear} className="min-h-10 rounded-md px-2 text-xs font-semibold text-text-secondary outline-none hover:bg-white/5 hover:text-accent focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent">{t("backToList")}</button>
      </div>}
      <p id="atlas-picker-hint" aria-live="polite" className={`min-h-9 break-keep pt-3 text-center text-xs leading-5 [overflow-wrap:anywhere] [@media(max-height:560px)]:sr-only [@media(max-height:560px)]:min-h-0 [@media(max-height:560px)]:p-0 ${ready ? "text-accent/80" : "text-text-tertiary"}`}>
        {t(searching ? "searchPickHint" : active === 2 ? "groupPickHint" : ready ? "openNext" : "selectThenOpen", { next: active < 2 ? t(kinds[active + 1]) : "" })}
      </p>
    </div>
  );
}
