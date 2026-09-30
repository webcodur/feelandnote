"use client";

import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ATLAS_NAV_LAYOUT, atlasSelection, firstAtlasEntry, type AtlasSelection, type AtlasTheme } from "./atlasNavigationData";

interface Props {
  tree: AtlasTheme[];
  selection: AtlasSelection;
  onSelect: (selection: AtlasSelection) => void;
  /** 선택기 창은 신화 단위 리마운트(MythOverview key) 밖에서 떠야 한다 — 호출부가 AtlasPicker를 띄운다 */
  onOpenPicker: (level: number) => void;
  myth: boolean;
  overview?: ReactNode;
}

export default function AtlasNavigation({ tree, selection, onSelect, onOpenPicker, myth, overview }: Props) {
  const t = useTranslations("explore.ui.atlas");
  const tUi = useTranslations("explore.ui");
  const tMyth = useTranslations("explore.hub.myth");
  const tFaction = useTranslations("explore.faction");
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

  /* 맨 위 줄은 세계 — 신화의 세계와 세력도감을 오간다. 아래 세 줄은 세계 안의 선택이라 화살표
     순환이지만, 이 줄은 반대 세계의 대문으로 가는 링크다(신화 대문은 마지막 읽은 신화를 다시 연다) */
  const worlds = [
    { name: tMyth("title"), href: "/explore/myth", current: myth },
    { name: tFaction("title"), href: "/explore/faction", current: !myth },
  ];

  return (
    <div className={ATLAS_NAV_LAYOUT.root} data-atlas-navigation>
      <div role="group" aria-label={t("world")} data-atlas-level="world"
        className="grid grid-cols-2 gap-1 rounded-lg border border-white/20 bg-bg-main p-1">
        {worlds.map((world) => world.current ? (
          <span key={world.href} aria-current="page"
            className="flex min-h-9 items-center justify-center rounded-md bg-accent/15 px-2 text-center text-sm font-bold text-accent">
            {world.name}
          </span>
        ) : (
          <Link key={world.href} href={world.href}
            className="flex min-h-9 items-center justify-center rounded-md px-2 text-center text-sm font-semibold text-text-secondary outline-none hover:bg-white/10 hover:text-accent focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent">
            {world.name}
          </Link>
        ))}
      </div>
      {names.map((name, level) => (
        <div key={keys[level]} className={ATLAS_NAV_LAYOUT.row} data-atlas-level={level}>
          <button type="button" className={arrow} disabled={choices[level].length < 2} onClick={() => step(level, -1)} aria-label={`${tUi("prev")} ${labels[level]}`}><ChevronLeft size={17} aria-hidden /></button>
          <button type="button" aria-haspopup="dialog" aria-label={`${labels[level]} · ${name} · ${t("optionCount", { count: counts[level] })}`} title={name} data-atlas-count={counts[level]} onClick={() => onOpenPicker(level)}
            className={`flex min-w-0 items-center justify-center gap-1.5 break-keep px-1 py-2 text-center text-sm font-semibold outline-none hover:bg-white/5 hover:text-accent focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent md:flex-col md:gap-1 md:py-2.5 md:text-base ${level === 1 ? "text-accent" : "text-text-primary"}`}>
            <span data-atlas-label className="order-last hidden shrink-0 text-sm font-medium leading-5 text-text-secondary md:order-first md:inline">{labels[level]}</span>
            <span data-atlas-value className="line-clamp-2">{name}</span>
          </button>
          <button type="button" className={arrow} disabled={choices[level].length < 2} onClick={() => step(level, 1)} aria-label={`${tUi("next")} ${labels[level]}`}><ChevronRight size={17} aria-hidden /></button>
        </div>
      ))}
      {overview && <div className={ATLAS_NAV_LAYOUT.footer}>{overview}</div>}
    </div>
  );
}
