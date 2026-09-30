"use client";

import { useEffect, useState } from "react";
import { Check, Images } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import Modal from "@/components/ui/Modal";
import { useMouseDragScroll } from "@/hooks/useMouseDragScroll";
import { FACTION_PERSON_LAYOUT } from "@/components/features/faction/entry/factionPersonLayout";
import { atlasSelection, firstAtlasEntry, type AtlasSelection, type AtlasTheme } from "./atlasNavigationData";

interface Props {
  tree: AtlasTheme[];
  /** 창을 열 때의 선택 — 창 안에서는 초안만 고치고, 나갈 때(선택 완료·X·ESC·바깥) 한 번에 적용한다 */
  selection: AtlasSelection;
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
      className={`${cursorClassName} custom-scrollbar animate-fade-in mt-3 grid h-[42dvh] select-none content-start grid-cols-2 gap-3 overflow-y-auto rounded-xl border border-white/10 bg-bg-secondary p-2 [overflow-anchor:none] motion-reduce:animate-none md:grid-cols-3 md:p-3`}>
      {items.map((item) => <button key={item.id ?? "all"} type="button" disabled={item.disabled} aria-pressed={item.id === current.id} onClick={() => onSelect(item.id)}
        /* 셀 배경 자체를 칸보다 작게(m-0.5) — 선택·hover 강조 면이 이웃 항목에 닿지 않게.
           hover는 중성 테두리만 밝혀 accent 강조가 나란히 붙지 않게 한다 */
        className={`relative m-0.5 flex min-h-11 min-w-0 max-w-full items-center justify-center rounded-lg border px-7 py-2 text-center text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent ${item.id === current.id ? "border-accent/60 bg-accent/10 text-accent hover:bg-accent/20" : "border-white/15 text-text-primary hover:border-white/40 hover:bg-white/5"} disabled:cursor-default disabled:text-text-tertiary disabled:opacity-50`}>
        {/* 양쪽 표식은 절대 배치라 항목 이름의 중앙 정렬을 밀지 않는다 — 장면 아이콘은 왼쪽, 체크·수는 오른쪽 */}
        {item.scenes ? (
          <span className="absolute start-2 top-1/2 -translate-y-1/2 text-accent" title={scenesLabel} role="img" aria-label={scenesLabel}>
            <Images size={13} aria-hidden />
          </span>
        ) : null}
        <span className="min-w-0 break-keep [overflow-wrap:anywhere]">{item.name}</span>
        {item.id === current.id
          ? <Check size={15} className="absolute end-2 top-1/2 shrink-0 -translate-y-1/2" aria-hidden />
          : item.count !== undefined && <span className="absolute end-2 top-1/2 -translate-y-1/2 text-xs font-medium tabular-nums text-text-secondary">{item.count}</span>}
      </button>)}
      {items.length === 0 && <p className="col-span-full p-3 text-sm text-text-secondary">{t("comingSoon")}</p>}
    </div>
  );
}

export default function AtlasPicker({ tree, selection, initialLevel, myth, onClose, onSelect }: Props) {
  const t = useTranslations("explore.ui.atlas");
  const tMyth = useTranslations("explore.hub.myth");
  const tFaction = useTranslations("explore.faction");
  const router = useRouter();
  const [active, setActive] = useState(initialLevel);
  /* 창이 떠 있는 동안 누른 항목은 초안에만 쌓는다 — 누를 때마다 뒤 화면이 갈아끼워지는 걸 막는다(26.09.30 유저 지시).
     체크 표시·하단 위치 줄은 초안을 따라간다 */
  const [draft, setDraft] = useState<AtlasSelection>(selection);
  const { theme, entry, group } = atlasSelection(tree, draft);
  const all = { id: null, name: t("allMembers"), count: entry?.count };
  const current = [theme ?? { id: null, name: "" }, entry ?? { id: null, name: t("comingSoon") }, group ?? all];
  const items: Option[][] = [tree.map((item) => ({ ...item, disabled: !firstAtlasEntry(item) })), theme?.entries ?? [], entry ? [all, ...entry.groups] : []];
  const kinds = myth ? (["region", "myth", "group"] as const) : (["theme", "faction", "group"] as const);
  /* 지역·테마를 고르면 그 첫 신화·팩션으로 예비 선택한다 — 탐색판 윗줄 화살표와 같은 규칙이다.
     지금 고른 지역·신화를 다시 누르면 초안을 그대로 두고, 고른 그룹을 다시 누르면 「전체 구성원」으로 푼다 */
  const choose = (level: number, id: string | null) => {
    if (level === 0) {
      const next = tree.find((item) => item.id === id)!;
      setDraft(next.id === draft.themeId ? draft : { themeId: next.id, entryId: firstAtlasEntry(next)?.id ?? null, groupId: null });
    } else if (level === 1) {
      setDraft(id === draft.entryId ? draft : { ...draft, entryId: id, groupId: null });
    } else setDraft({ ...draft, groupId: draft.groupId === id ? null : id });
  };
  /* 나가는 모든 경로에서 초안을 한 번에 적용한다 — 선택이 원래대로면 건너뛴다 */
  const commit = () => {
    if (draft.themeId !== selection.themeId || draft.entryId !== selection.entryId || draft.groupId !== selection.groupId) onSelect(draft);
    onClose();
  };
  /* 세계 선택 — 반대 세계는 초안이 아니라 그 세계의 대문 주소로 곧바로 이동한다 */
  const worlds = [
    { name: tMyth("title"), href: "/explore/myth", current: myth },
    { name: tFaction("title"), href: "/explore/faction", current: !myth },
  ];
  return (
    <Modal isOpen onClose={commit} title={t("browseAll")} widthClassName="max-w-2xl" frame="plain" boxClassName={FACTION_PERSON_LAYOUT.modal} animateHeight={false}>
      <div className="p-4 md:p-5" data-atlas-picker data-atlas-picker-level={initialLevel}>
        <div role="group" aria-label={t("world")} className="mb-2 grid grid-cols-2 gap-1.5">
          {worlds.map((world) => world.current ? (
            <span key={world.href} aria-current="page"
              className="flex min-h-10 items-center justify-center rounded-lg border border-accent/60 bg-accent/10 px-2 text-center text-sm font-semibold text-accent">
              {world.name}
            </span>
          ) : (
            <button key={world.href} type="button" onClick={() => { router.push(world.href); onClose(); }}
              className="flex min-h-10 items-center justify-center rounded-lg border border-white/15 px-2 text-center text-sm font-semibold text-text-secondary outline-none hover:border-accent/50 hover:bg-white/5 hover:text-accent focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent">
              {world.name}
            </button>
          ))}
        </div>
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
        <div className="mt-4 flex items-center gap-3 border-t border-white/10 pt-4">
          <p className="min-w-0 flex-1 text-sm leading-6 text-text-secondary">{[theme?.name, entry?.name, group?.name].filter(Boolean).join(" › ")}</p>
          <button type="button" onClick={commit}
            className="shrink-0 rounded-lg border border-accent/60 bg-accent/15 px-4 py-2 text-sm font-semibold text-accent outline-none hover:bg-accent/25 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent">
            {t("done")}
          </button>
        </div>
      </div>
    </Modal>
  );
}
