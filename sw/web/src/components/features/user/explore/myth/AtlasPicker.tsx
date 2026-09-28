"use client";

import { useEffect, useState } from "react";
import { Check, Images } from "lucide-react";
import { useTranslations } from "next-intl";
import Modal from "@/components/ui/Modal";
import { useMouseDragScroll } from "@/hooks/useMouseDragScroll";
import { FACTION_PERSON_LAYOUT } from "@/components/features/faction/entry/factionPersonLayout";
import { atlasSelection, firstAtlasEntry, type AtlasSelection, type AtlasTheme } from "./atlasNavigationData";

interface Props {
  tree: AtlasTheme[];
  initial: AtlasSelection;
  /** 처음 보여 줄 단계 — 탐색판에서 누른 줄의 단계가 열린 채 시작한다 */
  initialLevel: number;
  /** 신화 탐색이면 지역·신화·그룹, 세력도감이면 테마·팩션·그룹 */
  myth: boolean;
  onClose: () => void;
  onSelect: (selection: AtlasSelection) => void;
}
interface Option { id: string | null; name: string; count?: number; disabled?: boolean; scenes?: number }

/* 활성 단계의 선택지 패널 — 단계가 바뀌면 key로 새로 그려 페이드하고 선택 항목으로 스크롤한다 */
function OptionPanel({ level, items, current, onSelect }: {
  level: number; items: Option[]; current: Option; onSelect: (id: string | null) => void;
}) {
  const t = useTranslations("explore.ui.atlas");
  const tScenes = useTranslations("explore.hub.myth");
  const scenesLabel = tScenes("keyScenes");
  const { ref, cursorClassName, dragProps } = useMouseDragScroll("y");
  useEffect(() => {
    const list = ref.current;
    const selected = list?.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (!list || !selected) return;
    const top = selected.offsetTop - list.offsetTop;
    if (top < list.scrollTop || top + selected.offsetHeight > list.scrollTop + list.clientHeight) {
      list.scrollTop = top - (list.clientHeight - selected.offsetHeight) / 2;
    }
  }, [current.id, ref]);
  return (
    <div ref={ref} {...dragProps} role="tabpanel" id="atlas-panel" aria-labelledby={`atlas-tab-${level}`} data-atlas-panel data-atlas-column={level}
      className={`${cursorClassName} custom-scrollbar animate-fade-in mt-3 grid h-[42dvh] select-none content-start grid-cols-2 gap-1.5 overflow-y-auto rounded-xl border border-white/10 bg-bg-secondary p-2 [overflow-anchor:none] motion-reduce:animate-none md:grid-cols-3 md:p-3`}>
      {items.map((item) => <button key={item.id ?? "all"} type="button" disabled={item.disabled} aria-pressed={item.id === current.id} onClick={() => onSelect(item.id)}
        className={`flex min-h-11 min-w-0 max-w-full items-center gap-2 rounded-lg border px-3 py-2 text-center text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent ${item.id === current.id ? "border-accent/60 bg-accent/10 text-accent hover:bg-accent/20" : "border-white/15 text-text-primary hover:border-accent/50 hover:bg-white/5"} disabled:cursor-default disabled:text-text-tertiary disabled:opacity-50`}>
        <span className="min-w-0 flex-1 break-keep [overflow-wrap:anywhere]">{item.name}</span>
        {item.scenes ? (
          <span className="flex shrink-0 items-center gap-0.5 text-accent" title={scenesLabel} role="img" aria-label={`${scenesLabel} ${item.scenes}`}>
            <Images size={13} aria-hidden />
            <span className="text-xs font-medium tabular-nums">{item.scenes}</span>
          </span>
        ) : null}
        {item.id === current.id ? <Check size={15} className="shrink-0" aria-hidden /> : item.count !== undefined && <span className="text-xs font-medium tabular-nums text-text-secondary">{item.count}</span>}
      </button>)}
      {items.length === 0 && <p className="col-span-full p-3 text-sm text-text-secondary">{t("comingSoon")}</p>}
    </div>
  );
}

export default function AtlasPicker({ tree, initial, initialLevel, myth, onClose, onSelect }: Props) {
  const t = useTranslations("explore.ui.atlas");
  const [active, setActive] = useState(initialLevel);
  const { theme, entry, group } = atlasSelection(tree, initial);
  const all = { id: null, name: t("allMembers"), count: entry?.count };
  const current = [theme ?? { id: null, name: "" }, entry ?? { id: null, name: t("comingSoon") }, group ?? all];
  const items: Option[][] = [tree.map((item) => ({ ...item, disabled: !firstAtlasEntry(item) })), theme?.entries ?? [], entry ? [all, ...entry.groups] : []];
  const kinds = myth ? (["region", "myth", "group"] as const) : (["theme", "faction", "group"] as const);
  /* 누르면 곧바로 적용하고 창을 닫는다(확인 단추 없음, 26.09.29 유저 지시). 탭은 다른 단계의 목록을 보러 갈 때만 쓴다.
     지역·테마를 고르면 그 첫 신화·팩션으로 연다 — 탐색판 윗줄 화살표와 같은 규칙이다.
     지금 고른 지역·신화를 다시 누르면 선택을 그대로 두고, 고른 그룹을 다시 누르면 「전체 구성원」으로 푼다 */
  const choose = (level: number, id: string | null) => {
    if (level === 0) {
      const next = tree.find((item) => item.id === id)!;
      onSelect(next.id === initial.themeId ? initial : { themeId: next.id, entryId: firstAtlasEntry(next)?.id ?? null, groupId: null });
    } else if (level === 1) {
      onSelect(id === initial.entryId ? initial : { ...initial, entryId: id, groupId: null });
    } else onSelect({ ...initial, groupId: initial.groupId === id ? null : id });
  };
  return (
    <Modal isOpen onClose={onClose} title={t("browseAll")} widthClassName="max-w-2xl" frame="plain" boxClassName={FACTION_PERSON_LAYOUT.modal} animateHeight={false}>
      <div className="p-4 md:p-5" data-atlas-picker data-atlas-picker-level={initialLevel}>
        <div role="tablist" aria-label={t("browseAll")} className="grid grid-cols-3 gap-1.5">
          {[0, 1, 2].map((level) => (
            <button key={level} type="button" role="tab" id={`atlas-tab-${level}`} data-atlas-tab={level} aria-selected={active === level} aria-controls="atlas-panel"
              onClick={() => setActive(level)}
              className={`min-h-11 min-w-0 rounded-lg border px-2 py-2 text-center text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent ${active === level ? "border-accent/60 bg-accent/10 text-accent" : "border-white/15 text-text-secondary hover:border-accent/50 hover:bg-white/5 hover:text-accent"}`}>
              <span className="block truncate">{t(kinds[level])}</span>
            </button>
          ))}
        </div>
        <OptionPanel key={active} level={active} items={items[active]} current={current[active]} onSelect={(id) => choose(active, id)} />
        {/* 지금 보는 위치 — 그룹 탭에서도 어느 신화의 그룹인지 알 수 있게 남긴다 */}
        <p className="mt-4 min-w-0 border-t border-white/10 pt-4 text-sm leading-6 text-text-secondary">{[theme?.name, entry?.name, group?.name].filter(Boolean).join(" › ")}</p>
      </div>
    </Modal>
  );
}
