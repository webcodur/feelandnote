"use client";

import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { ATLAS_NAV_LAYOUT, atlasSelection, firstAtlasEntry, type AtlasSelection, type AtlasTheme } from "./atlasNavigationData";

interface Props {
  tree: AtlasTheme[];
  selection: AtlasSelection;
  onSelect: (selection: AtlasSelection) => void;
  /** 선택기 창은 항목 단위 리마운트(AtlasOverview key) 밖에서 떠야 한다 — 호출부가 AtlasPicker를 띄운다 */
  onOpenPicker: (level: number) => void;
  myth: boolean;
  overview?: ReactNode;
  pending?: boolean;
  levels?: readonly (0 | 1 | 2)[];
  /** 한 단계만 표시할 때 선택한 이름이 구획 제목도 맡는다. */
  titleAs?: "h1" | "h2";
}

export default function AtlasNavigation({ tree, selection, onSelect, onOpenPicker, myth, overview, pending = false, levels = [0, 1, 2], titleAs }: Props) {
  const t = useTranslations("explore.ui.atlas");
  const tUi = useTranslations("explore.ui");
  const tMembers = useTranslations("explore.hub.myth");
  const { theme, entry, group } = atlasSelection(tree, selection);
  const memberCount = group?.count ?? entry?.count;
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
  const ValueTag = titleAs ?? "div";

  return (
    <div className={`${ATLAS_NAV_LAYOUT.root} relative`} data-atlas-navigation aria-busy={pending}>
      {levels.map((level) => (
        <div key={keys[level]} className={ATLAS_NAV_LAYOUT.selectorRow} data-atlas-level={level}>
          <button type="button" className={arrow} disabled={pending || choices[level].length < 2} onClick={() => step(level, -1)} aria-label={`${tUi("prev")} ${labels[level]}`}><ChevronLeft size={17} aria-hidden /></button>
          <ValueTag className="flex min-w-0 items-stretch">
            <button type="button" disabled={pending} aria-haspopup="dialog" aria-label={`${labels[level]} · ${names[level]} · ${t("optionCount", { count: counts[level] })}`} title={names[level]} data-atlas-count={counts[level]} onClick={() => onOpenPicker(level)}
              className="group flex w-full min-w-0 flex-col items-center justify-center gap-1 px-2 py-2.5 text-center text-text-primary outline-none hover:bg-white/5 hover:text-accent focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent">
              <span data-atlas-label className="inline-flex flex-wrap items-center justify-center gap-x-2 text-[11px] font-normal leading-4 text-text-tertiary">
                {labels[level]}
                {level === 2 && memberCount !== undefined && <span data-atlas-member-count className="whitespace-nowrap tabular-nums text-text-secondary">{tMembers("groupMemberCount", { count: memberCount })}</span>}
              </span>
              <span data-atlas-value className={`min-w-0 break-keep font-semibold leading-snug [overflow-wrap:anywhere] ${level === 1 ? "text-xl tracking-tight md:text-2xl" : "text-base md:text-lg"}`}>
                {names[level]}
              </span>
            </button>
          </ValueTag>
          <button type="button" className={arrow} disabled={pending || choices[level].length < 2} onClick={() => step(level, 1)} aria-label={`${tUi("next")} ${labels[level]}`}>
            {pending && level === 1 ? <Loader2 size={17} aria-hidden className="animate-spin text-accent motion-reduce:animate-none" /> : <ChevronRight size={17} aria-hidden />}
          </button>
        </div>
      ))}
      {overview && <div className={ATLAS_NAV_LAYOUT.footer}>{overview}</div>}
    </div>
  );
}
