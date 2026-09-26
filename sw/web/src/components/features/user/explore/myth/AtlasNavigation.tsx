"use client";

import { useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, ListFilter } from "lucide-react";
import { useTranslations } from "next-intl";
import AtlasPicker from "./AtlasPicker";
import { ATLAS_NAV_LAYOUT, atlasSelection, firstAtlasEntry, type AtlasSelection, type AtlasTheme } from "./atlasNavigationData";

interface Props {
  tree: AtlasTheme[];
  selection: AtlasSelection;
  onSelect: (selection: AtlasSelection) => void;
  myth: boolean;
  overview?: ReactNode;
}

export default function AtlasNavigation({ tree, selection, onSelect, myth, overview }: Props) {
  const t = useTranslations("explore.ui.atlas");
  const tUi = useTranslations("explore.ui");
  const [pickerLevel, setPickerLevel] = useState<number | "all" | null>(null);
  const { theme, entry, group } = atlasSelection(tree, selection);
  const labels = [t(myth ? "region" : "theme"), t(myth ? "myth" : "faction"), t("group")];
  const choices = [
    tree.filter((item) => firstAtlasEntry(item)).map((item) => ({ themeId: item.id, entryId: firstAtlasEntry(item)!.id, groupId: null })),
    (theme?.entries ?? []).filter((item) => !item.disabled).map((item) => ({ ...selection, entryId: item.id, groupId: null })),
    [null, ...(entry?.groups.map((item) => item.id) ?? [])].map((id) => ({ ...selection, groupId: id })),
  ];
  const names = [theme?.name, entry?.name ?? t("comingSoon"), group?.name ?? t("allMembers")];
  const counts = [choices[0].length, choices[1].length, entry?.groups.length ?? 0];
  const ids = [selection.themeId, selection.entryId, selection.groupId];
  const keys = ["themeId", "entryId", "groupId"] as const;
  const step = (level: number, direction: number) => {
    const items = choices[level];
    const current = items.findIndex((item) => item[keys[level]] === ids[level]);
    onSelect(items[(current + direction + items.length) % items.length]);
  };
  const arrow = "grid place-items-center text-text-secondary outline-none hover:bg-white/10 hover:text-accent focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent disabled:text-text-tertiary disabled:opacity-30 disabled:hover:bg-transparent";

  return (
    <div className={ATLAS_NAV_LAYOUT.root} data-atlas-navigation>
      {names.map((name, level) => (
        <div key={keys[level]} className={ATLAS_NAV_LAYOUT.row} data-atlas-level={level}>
          <button type="button" className={arrow} disabled={choices[level].length < 2} onClick={() => step(level, -1)} aria-label={`${tUi("prev")} ${labels[level]}`}><ChevronLeft size={17} aria-hidden /></button>
          <button type="button" aria-haspopup="dialog" aria-label={`${labels[level]} · ${name} · ${t("optionCount", { count: counts[level] })}`} title={name} onClick={() => setPickerLevel(level)}
            className={`flex min-w-0 items-center justify-center gap-1.5 break-keep px-1 py-2 text-center text-sm font-semibold outline-none hover:bg-white/5 hover:text-accent focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent md:flex-col md:gap-1 md:py-2.5 md:text-base ${level === 1 ? "text-accent" : "text-text-primary"}`}>
            <span className="order-last flex shrink-0 items-center justify-center gap-1.5 md:order-first">
              <span data-atlas-label className="hidden text-sm font-medium leading-5 text-text-secondary md:inline">{labels[level]}</span>
              <span data-atlas-count aria-hidden className={`min-w-5 rounded px-1 py-0.5 text-[11px] font-semibold leading-4 tabular-nums md:text-xs ${level === 0 ? "bg-white/10 text-text-primary" : "bg-accent/10 text-accent"}`}>{counts[level]}</span>
            </span>
            <span data-atlas-value className="line-clamp-2">{name}</span>
          </button>
          <button type="button" className={arrow} disabled={choices[level].length < 2} onClick={() => step(level, 1)} aria-label={`${tUi("next")} ${labels[level]}`}><ChevronRight size={17} aria-hidden /></button>
        </div>
      ))}
      <div className={ATLAS_NAV_LAYOUT.footer}>
        <button type="button" className={ATLAS_NAV_LAYOUT.action} aria-haspopup="dialog" data-atlas-picker-trigger onClick={() => setPickerLevel("all")}><ListFilter size={16} aria-hidden />{t("browseAll")}</button>
        {overview}
      </div>
      {pickerLevel !== null && <AtlasPicker tree={tree} initial={selection} initialLevel={pickerLevel === "all" ? null : pickerLevel} labels={labels}
        onClose={() => setPickerLevel(null)} onSelect={(next) => { onSelect(next); setPickerLevel(null); }} />}
    </div>
  );
}
