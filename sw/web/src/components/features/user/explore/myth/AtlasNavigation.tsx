"use client";

import { useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
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
  const [pickerLevel, setPickerLevel] = useState<number | null>(null);
  const { theme, entry, group } = atlasSelection(tree, selection);
  const labels = [t(myth ? "region" : "theme"), t(myth ? "myth" : "faction"), t("group")];
  const choices = [
    tree.filter((item) => firstAtlasEntry(item)).map((item) => ({ themeId: item.id, entryId: firstAtlasEntry(item)!.id, groupId: null })),
    // 신화 탐색은 좌우 이동이 지역 경계를 넘어 다음 지역의 신화로 이어진다
    myth
      ? tree.flatMap((item) => item.entries.filter((e) => !e.disabled).map((e) => ({ themeId: item.id, entryId: e.id, groupId: null })))
      : (theme?.entries ?? []).filter((item) => !item.disabled).map((item) => ({ ...selection, entryId: item.id, groupId: null })),
    [null, ...(entry?.groups.map((item) => item.id) ?? [])].map((id) => ({ ...selection, groupId: id })),
  ];
  const names = [theme?.name, entry?.name ?? t("comingSoon"), group?.name ?? t("allMembers")];
  // 개수는 선택기 목록 기준 — 신화 줄의 화살표는 지역을 넘나들지만 선택기는 현재 지역만 나열한다
  const counts = [choices[0].length, (theme?.entries ?? []).filter((item) => !item.disabled).length, entry?.groups.length ?? 0];
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
          <button type="button" aria-haspopup="dialog" aria-label={`${labels[level]} · ${name} · ${t("optionCount", { count: counts[level] })}`} title={name} data-atlas-count={counts[level]} onClick={() => setPickerLevel(level)}
            className={`flex min-w-0 items-center justify-center gap-1.5 break-keep px-1 py-2 text-center text-sm font-semibold outline-none hover:bg-white/5 hover:text-accent focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent md:flex-col md:gap-1 md:py-2.5 md:text-base ${level === 1 ? "text-accent" : "text-text-primary"}`}>
            <span data-atlas-label className="order-last hidden shrink-0 text-sm font-medium leading-5 text-text-secondary md:order-first md:inline">{labels[level]}</span>
            <span data-atlas-value className="line-clamp-2">{name}</span>
          </button>
          <button type="button" className={arrow} disabled={choices[level].length < 2} onClick={() => step(level, 1)} aria-label={`${tUi("next")} ${labels[level]}`}><ChevronRight size={17} aria-hidden /></button>
        </div>
      ))}
      {overview && <div className={ATLAS_NAV_LAYOUT.footer}>{overview}</div>}
      {pickerLevel !== null && <AtlasPicker tree={tree} initial={selection} initialLevel={pickerLevel} myth={myth}
        onClose={() => setPickerLevel(null)} onSelect={(next) => { onSelect(next); setPickerLevel(null); }} />}
    </div>
  );
}
