"use client";

import { useEffect, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";
import Modal from "@/components/ui/Modal";
import { useMouseDragScroll } from "@/hooks/useMouseDragScroll";
import { FACTION_PERSON_LAYOUT } from "@/components/features/faction/entry/factionPersonLayout";
import { atlasSelection, firstAtlasEntry, type AtlasSelection, type AtlasTheme } from "./atlasNavigationData";

interface Props {
  tree: AtlasTheme[];
  initial: AtlasSelection;
  initialLevel: number | null;
  labels: string[];
  onClose: () => void;
  onSelect: (selection: AtlasSelection) => void;
}
interface Option { id: string | null; name: string; count?: number; disabled?: boolean }

function PickerColumn({ level, label, current, items, expanded, standalone = false, onExpand, onSelect }: {
  level: number; label: string; current: Option; items: Option[]; expanded: boolean;
  standalone?: boolean;
  onExpand: () => void; onSelect: (id: string | null) => void;
}) {
  const t = useTranslations("explore.ui.atlas");
  const { ref, cursorClassName, dragProps } = useMouseDragScroll("y");
  useEffect(() => {
    const list = ref.current;
    const selected = list?.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (!list || !selected) return;
    const top = selected.offsetTop - list.offsetTop;
    if (top < list.scrollTop || top + selected.offsetHeight > list.scrollTop + list.clientHeight) {
      list.scrollTop = top - (list.clientHeight - selected.offsetHeight) / 2;
    }
  }, [current.id, expanded, ref]);
  return (
    <section className={standalone ? "min-w-0" : "min-w-0 overflow-hidden rounded-xl border border-white/10 bg-bg-secondary"} data-atlas-column={level}>
      {!standalone && <h3 className="border-b border-white/10">
        <button type="button" aria-expanded={expanded} onClick={onExpand} className="flex w-full items-center justify-between gap-3 p-3 text-start outline-none hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent md:hidden">
          <span className="text-sm text-text-secondary">{label}</span>
          <span className="min-w-0 flex-1 break-keep text-end text-sm font-semibold text-accent">{current.name}</span>
          <ChevronDown size={16} aria-hidden className={expanded ? "rotate-180" : ""} />
        </button>
        <span className="hidden px-4 py-3 text-sm font-semibold text-text-secondary md:block">{label}</span>
      </h3>}
      <div ref={ref} {...dragProps} className={`${cursorClassName} custom-scrollbar select-none content-start overflow-y-auto [overflow-anchor:none] ${standalone ? "flex max-h-[60dvh] flex-wrap gap-2 p-1" : `${expanded ? "grid" : "hidden"} max-h-[36dvh] grid-cols-2 gap-1.5 p-2 md:grid md:h-[min(48dvh,24rem)] md:max-h-none md:grid-cols-1`}`}>
        {items.map((item) => <button key={item.id ?? "all"} type="button" disabled={item.disabled} aria-pressed={item.id === current.id} onClick={() => onSelect(item.id)}
          className={`flex min-h-11 min-w-0 max-w-full items-center gap-2 rounded-lg border px-3 py-2 text-start text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent ${item.id === current.id ? "border-accent/60 bg-accent/10 text-accent hover:bg-accent/20" : "border-white/15 text-text-primary hover:border-accent/50 hover:bg-white/5"} disabled:cursor-default disabled:text-text-tertiary disabled:opacity-50`}>
          <span className="min-w-0 flex-1 break-keep [overflow-wrap:anywhere]">{item.name}</span>
          {item.id === current.id ? <Check size={15} className="shrink-0" aria-hidden /> : item.count !== undefined && <span className="text-xs font-medium tabular-nums text-text-secondary">{item.count}</span>}
        </button>)}
        {items.length === 0 && <p className="col-span-full p-3 text-sm text-text-secondary">{t("comingSoon")}</p>}
      </div>
    </section>
  );
}

export default function AtlasPicker({ tree, initial, initialLevel, labels, onClose, onSelect }: Props) {
  const t = useTranslations("explore.ui.atlas");
  const [draft, setDraft] = useState(initial);
  const [expanded, setExpanded] = useState(initialLevel ?? 0);
  const standalone = initialLevel !== null;
  const { theme, entry, group } = atlasSelection(tree, draft);
  const all = { id: null, name: t("allMembers"), count: entry?.count };
  const current = [theme ?? { id: null, name: "" }, entry ?? { id: null, name: t("comingSoon") }, group ?? all];
  const items: Option[][] = [tree.map((item) => ({ ...item, disabled: !firstAtlasEntry(item) })), theme?.entries ?? [], entry ? [all, ...entry.groups] : []];
  const levels = standalone ? [initialLevel] : [0, 1, 2];
  const context = [theme?.name, entry?.name].slice(0, initialLevel ?? 0).filter(Boolean).join(" › ");
  const choose = (level: number, id: string | null) => {
    if (level === 0) {
      const next = tree.find((item) => item.id === id)!;
      const selection = { themeId: next.id, entryId: firstAtlasEntry(next)?.id ?? null, groupId: null };
      if (standalone) return onSelect(selection);
      setDraft(selection);
      setExpanded(1);
    } else if (level === 1) {
      const selection = { ...draft, entryId: id, groupId: null };
      if (standalone) return onSelect(selection);
      setDraft(selection);
      setExpanded(2);
    } else onSelect({ ...draft, groupId: draft.groupId === id ? null : id });
  };
  return (
    <Modal isOpen onClose={onClose} title={standalone ? labels[initialLevel] : t("browseAll")} size="full" widthClassName={standalone ? "max-w-2xl" : undefined} frame="plain" boxClassName={FACTION_PERSON_LAYOUT.modal} animateHeight={false}>
      <div className="p-4 md:p-5" data-atlas-picker data-atlas-picker-level={initialLevel ?? "all"}>
        {standalone && context && <p className="mb-3 text-sm leading-6 text-text-secondary">{context}</p>}
        <div className={standalone ? "min-w-0" : "grid gap-3 md:grid-cols-3"}>
          {levels.map((level) => <PickerColumn key={level} level={level} label={labels[level]} current={current[level]} items={items[level]} standalone={standalone} expanded={expanded === level} onExpand={() => setExpanded(expanded === level ? -1 : level)} onSelect={(id) => choose(level, id)} />)}
        </div>
        {!standalone && <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
          <p className="min-w-0 text-sm leading-6 text-text-secondary">{[theme?.name, entry?.name, group?.name].filter(Boolean).join(" › ")}</p>
          <button type="button" data-atlas-apply disabled={!entry || entry.disabled} onClick={() => onSelect(draft)} className="min-h-11 w-full shrink-0 rounded-lg border border-accent bg-accent/15 px-5 py-2 text-sm font-bold text-accent outline-none hover:bg-accent/25 focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-40 md:w-auto">{t("confirmSelection")}</button>
        </div>}
      </div>
    </Modal>
  );
}
