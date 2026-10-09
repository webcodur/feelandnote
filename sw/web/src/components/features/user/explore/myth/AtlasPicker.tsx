"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import Modal from "@/components/ui/Modal";
import { FACTION_PERSON_LAYOUT } from "@/components/features/faction/entry/factionPersonLayout";
import { ATLAS_GROUP_PARAM, atlasSelection, atlasStepKeys, firstAtlasEntry, type AtlasSelection, type AtlasTheme } from "./atlasNavigationData";
import AtlasPickerControls from "./AtlasPickerControls";
import AtlasPickerOptions, { type AtlasPickerOption } from "./AtlasPickerOptions";
import { useAtlasPicker } from "./useAtlasPicker";

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
  const tMyth = useTranslations("explore.hub.myth");
  const tFaction = useTranslations("explore.faction");
  const router = useRouter();
  const [active, setActive] = useState(initialLevel);
  const [query, setQuery] = useState("");
  const [armed, setArmed] = useState<string | null>(null);
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
  const ready = !search && active < 2 && armed === `${picker.world}:${active}:${currentIds[active]}`;
  const nextLabel = active < 2 ? t(atlasStepKeys(picker.world)[active + 1]) : undefined;
  const changeLevel = (level: number) => { setActive(level); setQuery(""); setArmed(null); };

  const choose = (item: AtlasPickerOption) => {
    const draft = picker.draft;
    if (search) {
      picker.setDraft({ themeId: item.themeId!, entryId: item.id, groupId: item.id === draft.entryId ? draft.groupId : null });
      setQuery("");
      setActive(1);
      setArmed(`${picker.world}:1:${item.id}`);
      return;
    }
    if (active === 2 && item.id === currentIds[2]) {
      commit({ ...draft, groupId: item.id });
      return;
    }
    if (active < 2 && ready && item.id === currentIds[active]) {
      changeLevel(active + 1);
      document.getElementById(`atlas-tab-${active + 1}`)?.focus({ preventScroll: true });
      return;
    }
    setArmed(active < 2 ? `${picker.world}:${active}:${item.id}` : null);
    if (active === 0) {
      const next = picker.tree.find((parent) => parent.id === item.id)!;
      picker.setDraft(next.id === draft.themeId ? draft : { themeId: next.id, entryId: firstAtlasEntry(next)?.id ?? null, groupId: null });
    } else if (active === 1) {
      picker.setDraft(item.id === draft.entryId ? draft : { ...draft, entryId: item.id, groupId: null });
    } else picker.setDraft({ ...draft, groupId: item.id });
  };
  // 임시 선택은 하단 확정 버튼 또는 선택된 그룹 재클릭으로 본문에 적용한다.
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
  return (
    <Modal isOpen onClose={onClose} title={path || (picker.world === "myth" ? tMyth("title") : tFaction("title"))} ariaLabel={t("browseAll")} titleClassName="max-w-full truncate font-semibold text-accent" stickyHeader
      widthClassName="max-w-2xl" frame="plain" boxClassName={FACTION_PERSON_LAYOUT.modal} scrollAreaClassName="[overflow-anchor:none]" animateHeightDuration={260}>
      <div className="flex flex-col" data-atlas-picker data-atlas-picker-level={initialLevel} data-atlas-world={picker.world}>
        <AtlasPickerControls world={picker.world} active={active} query={query} resultCount={items.length}
          selectionNames={[theme?.name ?? "—", entry?.name ?? "—", group?.name ?? t("allMembers")]} ready={ready}
          onQueryChange={(value) => { setQuery(value); setArmed(null); if (value.trim()) setActive(1); }}
          onWorldChange={(world) => { if (world !== picker.world) { picker.switchWorld(world); setActive(1); setArmed(null); } }}
          onTabChange={changeLevel}
          onSearchSelect={() => { if (searchChoices.length === 1) choose(searchChoices[0]); }} />
        <div className="flex flex-col px-4 pt-3 sm:px-5 [@media(max-height:560px)]:pt-1">
          <AtlasPickerOptions transitionKey={`${picker.world}:${active}`} level={active} items={items} currentId={currentIds[active]}
            searching={Boolean(search)} onSelect={choose} loading={picker.loading} error={picker.error} onRetry={picker.retry}
            pulseId={ready ? currentIds[active] : null} nextLabel={nextLabel} />
        </div>
        <div className="shrink-0 px-4 pb-4 sm:px-5 sm:pb-5 [@media(max-height:560px)]:pb-1">
          <div data-atlas-confirm className="mt-3 border-t border-white/10 bg-bg-main pt-3 [@media(max-height:560px)]:mt-1 [@media(max-height:560px)]:pt-1">
            <button type="button" onClick={() => commit()} disabled={!entry || entry.disabled || picker.loading || picker.error}
              className="group relative flex min-h-12 w-full items-center justify-center rounded-lg border border-accent bg-accent px-12 py-3 text-base font-semibold text-bg-main outline-none [@media(max-height:560px)]:min-h-11 [@media(max-height:560px)]:py-2 enabled:cursor-pointer enabled:hover:border-accent-hover enabled:hover:bg-accent-hover enabled:hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] enabled:active:bg-accent enabled:active:shadow-[inset_0_2px_6px_rgba(0,0,0,0.25)] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-bg-main disabled:cursor-default disabled:border-white/10 disabled:bg-transparent disabled:text-text-tertiary">
              {t("done")}
              <ArrowRight aria-hidden size={18} className="pointer-events-none absolute end-5 opacity-50 transition-transform duration-150 ease-out group-hover:translate-x-1 group-hover:opacity-100 group-focus-visible:opacity-100 group-active:translate-x-0 group-disabled:opacity-0 motion-reduce:transition-none" />
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
