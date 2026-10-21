"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import Modal from "@/components/ui/Modal";
import { FACTION_PERSON_LAYOUT } from "@/components/features/faction/entry/factionPersonLayout";
import { ATLAS_GROUP_PARAM, atlasSelection, firstAtlasEntry, type AtlasSelection, type AtlasTheme } from "./atlasNavigationData";
import AtlasPickerControls from "./AtlasPickerControls";
import AtlasPickerOptions, { type AtlasPickerOption } from "./AtlasPickerOptions";
import { useAtlasPicker } from "./useAtlasPicker";
import styles from "./AtlasPicker.module.css";

interface Props {
  tree: AtlasTheme[];
  selection: AtlasSelection;
  initialLevel: number;
  myth: boolean;
  onClose: () => void;
  onSelect: (selection: AtlasSelection) => void;
}

export default function AtlasPicker({ tree, selection, initialLevel, myth, onClose, onSelect }: Props) {
  const t = useTranslations("explore.ui.atlas");
  const router = useRouter();
  const [active, setActive] = useState(initialLevel);
  const [query, setQuery] = useState("");
  const [pulseKey, setPulseKey] = useState(0);
  const picker = useAtlasPicker(tree, selection, myth);
  const { theme, entry, group } = atlasSelection(picker.tree, picker.draft);
  const all = { id: null, name: t("allMembers"), count: entry?.count };
  const currentIds = [theme?.id ?? null, entry?.id ?? null, group?.id ?? null];
  const lists: AtlasPickerOption[][] = [picker.tree.map((item) => ({
    ...item,
    disabled: !firstAtlasEntry(item),
    completedSceneNames: item.entries.filter((child) => !child.disabled && child.scenesComplete).map((child) => child.name),
  })), theme?.entries ?? [], entry ? [all, ...entry.groups] : []];
  const search = query.trim().normalize("NFKC").toLocaleLowerCase().replace(/\s+/g, "");
  const items = search ? picker.tree.flatMap((parent) => parent.entries
    .filter((item) => `${parent.name}${item.name}`.normalize("NFKC").toLocaleLowerCase().replace(/\s+/g, "").includes(search))
    .map((item) => ({ ...item, themeId: parent.id, context: parent.name }))) : lists[active];
  const changeLevel = (level: number) => { setActive(level); setQuery(""); setPulseKey(0); };

  const choose = (item: AtlasPickerOption) => {
    if (item.disabled || picker.loading || picker.error) return;
    const draft = picker.draft;
    setPulseKey(value => value + 1);
    if (search) {
      picker.setDraft({ themeId: item.themeId!, entryId: item.id, groupId: item.id === draft.entryId ? draft.groupId : null });
      setQuery("");
      setActive(1);
      return;
    }
    if (active === 0) {
      const next = picker.tree.find((parent) => parent.id === item.id)!;
      picker.setDraft(next.id === draft.themeId ? draft : { themeId: next.id, entryId: firstAtlasEntry(next)?.id ?? null, groupId: null });
    } else if (active === 1) {
      picker.setDraft(item.id === draft.entryId ? draft : { ...draft, entryId: item.id, groupId: null });
    } else picker.setDraft({ ...draft, groupId: item.id });
  };
  // 칩은 한 번 눌러 임시 선택하고, 적용은 하단 선택 완료 버튼 한 곳에서만 한다.
  const commit = (next = picker.draft) => {
    const target = atlasSelection(picker.tree, next).entry;
    if (!target || target.disabled || picker.loading || picker.error) return;
    if ((picker.world === "myth") === myth) {
      if (next.themeId !== selection.themeId || next.entryId !== selection.entryId || next.groupId !== selection.groupId) onSelect(next);
    } else if (target.href) {
      const suffix = next.groupId ? `?${ATLAS_GROUP_PARAM}=${encodeURIComponent(next.groupId)}` : "";
      router.push(`${target.href}${suffix}`, { scroll: false });
    }
    onClose();
  };
  const path = [entry?.name ?? theme?.name, group?.name].filter(Boolean).join(" › ");
  const searchChoices = items.filter((item) => !item.disabled);
  const canCommit = Boolean(entry && !entry.disabled && !picker.loading && !picker.error);
  const confirm = (
    <button type="button" data-atlas-confirm onClick={() => commit()} disabled={!canCommit}
      aria-label={t("done")} title={`${t("done")}${path ? ` · ${path}` : ""}`}
      className="relative flex min-h-12 w-full items-center justify-center rounded-lg border border-accent bg-accent px-4 py-3 text-sm font-semibold text-bg-main outline-none enabled:hover:border-accent-hover enabled:hover:bg-accent-hover enabled:active:bg-accent focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-main disabled:cursor-default disabled:border-white/10 disabled:bg-transparent disabled:text-text-tertiary">
      {pulseKey > 0 && canCommit && <span key={pulseKey} aria-hidden data-atlas-confirm-pulse className={`pointer-events-none absolute -inset-1 rounded-xl border-2 border-accent ${styles.confirmPulse}`} />}
      {t("done")}
    </button>
  );
  return (
    <Modal isOpen onClose={onClose} ariaLabel={t("browseAll")} showCloseButton={false}
      widthClassName="max-w-2xl" frame="plain" boxClassName={FACTION_PERSON_LAYOUT.modal} scrollAreaClassName="[overflow-anchor:none]" animateHeightDuration={260}
      footer={<div data-atlas-picker-footer className="border-t border-line bg-bg-main p-4 sm:px-5 [@media(max-height:560px)]:py-2">{confirm}</div>}>
      <div className="flex flex-col" data-atlas-picker data-atlas-picker-level={initialLevel} data-atlas-world={picker.world}>
        <AtlasPickerControls world={picker.world} active={active} query={query} resultCount={items.length}
          selectionNames={[theme?.name ?? "—", entry?.name ?? "—", group?.name ?? t("allMembers")]} onClose={onClose}
          onQueryChange={(value) => { setQuery(value); setPulseKey(0); if (value.trim()) setActive(1); }}
          onWorldChange={(world) => { if (world !== picker.world) { picker.switchWorld(world); setActive(1); setPulseKey(0); } }}
          onTabChange={changeLevel}
          onSearchSelect={() => { if (searchChoices.length === 1) choose(searchChoices[0]); }} />
        <div className="flex flex-col px-4 pt-3 pb-4 sm:px-5 sm:pb-5 [@media(max-height:560px)]:pt-1 [@media(max-height:560px)]:pb-2">
          <AtlasPickerOptions transitionKey={`${picker.world}:${active}`} level={active} items={items} currentId={currentIds[active]}
            searching={Boolean(search)} onSelect={choose} loading={picker.loading} error={picker.error} onRetry={picker.retry} />
        </div>
      </div>
    </Modal>
  );
}
