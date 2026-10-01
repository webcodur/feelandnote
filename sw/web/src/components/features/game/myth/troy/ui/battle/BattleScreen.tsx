/*
  파일명: components/features/game/myth/troy/ui/battle/BattleScreen.tsx
  기능: 트로이 전쟁 싸움 화면
  책임: 3D 판을 화면 가득 깔고 그 위에 윗줄·장수 칸·행동 단추·싸움 예측·카메라 단추·알림을 겹친다.
        판 상태가 바뀔 때마다 강조 칸·길·고른 장수를 3D 판에 다시 넘긴다. 대화 장면은 판 아래쪽을 덮어 튼다.
        기술은 누르면 설명 칸(SkillSheet)을 먼저 띄우고, 연출 빠르기(빠르게)를 판과 알림에 함께 건다.
*/ // ------------------------------
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FastForward } from "lucide-react";
import { useTranslations } from "next-intl";
import { forecast, interactablesFor, planPhase, unitById, unitAt } from "../../engine";
import type { BattleState, Point, SkillKey } from "../../engine";
import BoardCanvas from "../../scene/BoardCanvas";
import { HIGHLIGHT_LAYERS } from "../../scene/types";
import type { ChapterStory } from "../../story/types";
import HelpSheet from "../HelpSheet";
import StoryPlayer from "../StoryPlayer";
import type { PickLine } from "../useFigureLines";
import type { Names } from "../useNames";
import ActionBar from "./ActionBar";
import BattleOverlays from "./BattleOverlays";
import BattleTopBar from "./BattleTopBar";
import CameraPad from "./CameraPad";
import ForecastCard from "./ForecastCard";
import { layersFor, pathFor } from "./highlights";
import { sceneUnits } from "./sceneUnits";
import SkillSheet from "./SkillSheet";
import UnitCard from "./UnitCard";
import { useBattle } from "./useBattle";
import { useBattleSpeed } from "./useBattleSpeed";
import { useDirectorHooks } from "./useDirectorHooks";
import { useOverlays } from "./useOverlays";

declare global {
  interface Window {
    __troy?: {
      state: () => BattleState;
      ui: () => ReturnType<typeof useBattle>["ui"];
      tap: (p: Point) => void;
      screenOf: (p: Point) => { x: number; y: number } | null;
      endTurn: () => void;
      auto: () => void;
    };
  }
}

// 이 장수에 판의 승패가 걸렸나(지는 조건의 대장, 이기는 조건의 적장)
function stakeOf(state: BattleState, id: string): "guard" | "target" | null {
  if (state.loss.some((r) => r.kind === "unitFalls" && r.unitIds.includes(id))) return "guard";
  return state.objective.kind === "defeat" && state.objective.unitIds.includes(id) ? "target" : null;
}

interface Props {
  no: number;
  story: ChapterStory;
  initial: BattleState;
  fresh: boolean;
  names: Names;
  medals: Record<string, string>;
  pickLine: PickLine;
  // 원정 표지(이야기에서 죽은 인물 dead:*) — 인물 외침이 기댄다
  campaignFlags: string[];
  onEnd: (state: BattleState) => void;
  onSave: (state: BattleState) => void;
  onQuit: (state: BattleState) => void;
}

export default function BattleScreen({ no, story, initial, fresh, names, medals, pickLine, campaignFlags, onEnd, onSave, onQuit }: Props) {
  const t = useTranslations("gameMythTroy");
  const overlays = useOverlays();
  const [danger, setDanger] = useState(false);
  const [hover, setHover] = useState<Point | null>(null);
  const units = useCallback((s: BattleState, hidden: string[] = []) => sceneUnits(s, names.unitName, medals, hidden), [names, medals]);
  const hooks = useDirectorHooks(units, story, overlays, names, pickLine, campaignFlags);
  const battle = useBattle({ initial, fresh, hooks, onEnd, onSave });
  const { state, ui, view } = battle;
  const speed = useBattleSpeed();
  const setOverlaySpeed = overlays.setSpeed;
  // 스스로 거는 기술을 쓰기 전에 설명을 보는 중(누른 장수·기술)
  const [peek, setPeek] = useState<{ unitId: string; skill: SkillKey } | null>(null);
  const [help, setHelp] = useState(false);

  useEffect(() => {
    view?.setSpeed(speed.scale);
    setOverlaySpeed(speed.scale);
  }, [view, speed.scale, setOverlaySpeed]);

  // 예언: 다음 적 차례의 움직임
  const intents = useMemo(() => {
    if (!state.flags.includes("intents") || state.phase !== "player") return [];
    return planPhase(state, "enemy").flatMap((a) => (a.type === "move" ? [a.to] : a.type === "attack" ? (() => { const u = unitById(state, a.targetId); return u ? [{ x: u.x, y: u.y }] : []; })() : []));
  }, [state]);

  useEffect(() => {
    if (!view) return;
    const layers = layersFor(state, ui, danger);
    if (intents.length > 0) layers.danger = [...(layers.danger ?? []), ...intents];
    for (const layer of HIGHLIGHT_LAYERS) view.highlight(layer, layers[layer] ?? []);
    view.setSelected(ui.selectedId);
  }, [view, state, ui, danger, intents]);

  // 길 미리 보기는 가리킨 칸이 바뀔 때마다 따로 고친다(강조 칸 전체를 다시 칠하지 않게)
  useEffect(() => {
    view?.showPath(pathFor(state, ui, hover));
  }, [view, state, ui, hover]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (overlays.dialogue || event.key !== "Escape") return;
      if (help) setHelp(false);
      else if (peek) setPeek(null);
      else battle.cancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [battle, overlays.dialogue, peek, help]);

  // 개발 서버에서만 여는 검수 손잡이(캡처 도구가 칸을 누르고 판을 읽는다)
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    window.__troy = { state: () => battle.state, ui: () => battle.ui, tap: battle.onTile, screenOf: (p) => view?.screenOf(p) ?? null, endTurn: () => void battle.endTurn(), auto: () => void battle.autoTurn() };
    return () => {
      delete window.__troy;
    };
  }, [battle, view]);

  // 판을 누르면 보던 기술 설명은 접는다
  const { onTile: tapTile } = battle;
  const onTile = useCallback((p: Point) => {
    setPeek(null);
    tapTile(p);
  }, [tapTile]);

  const onHover = useCallback((p: Point | null) => {
    setHover(p);
    view?.setCursor(p);
  }, [view]);

  const selected = ui.selectedId ? unitById(state, ui.selectedId) : null;
  const hovered = hover ? unitAt(state, hover) : null;
  const inspected = ui.inspectId ? unitById(state, ui.inspectId) : null;
  const shown = hovered ?? inspected ?? selected;
  const target = ui.targetId ? unitById(state, ui.targetId) : null;
  const preview = ui.mode === "target" && selected && target ? forecast(state, selected.id, target.id, ui.attackFrom ?? undefined) : null;
  const choosing = ui.mode === "moved" || ui.mode === "selected";
  const peeking = peek && selected && peek.unitId === selected.id && choosing ? peek.skill : null;
  const aiming = ui.mode === "skill" && ui.skill ? ui.skill : null;
  const sheetSkill = aiming ?? peeking;
  const showActions = selected && !selected.acted && choosing && state.phase === "player" && !peeking;
  const hint = state.phase !== "player" ? t("hud.enemyThinking") : ui.mode === "skill" ? t("hud.pickTarget") : ui.mode === "selected" ? t("hud.pickTile") : ui.mode === "idle" ? t("hud.pickUnit") : null;

  return (
    <div className="relative h-full w-full overflow-hidden bg-bg-secondary">
      <BoardCanvas className="absolute inset-0" onReady={battle.setView} onTileTap={onTile} onTileHover={onHover} label={story.title} />
      <BattleTopBar state={state} story={story} no={no} danger={danger} busy={battle.busy} onDanger={() => setDanger((v) => !v)} onEndTurn={() => void battle.endTurn()} onQuit={() => onQuit(state)} onHelp={() => setHelp(true)} />
      <div className="pointer-events-none absolute end-2 top-24 z-10 sm:end-4 sm:top-28">
        <CameraPad view={view} fast={speed.fast} onFast={speed.toggle} />
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex flex-col gap-2 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:flex-row sm:items-end sm:justify-between sm:px-4 sm:pb-4">
        {preview && selected && target && (
          <ForecastCard forecast={preview} attacker={selected} defender={target} names={names} onCancel={battle.cancel}
            onConfirm={() => battle.onTile({ x: target.x, y: target.y })} />
        )}
        {!preview && sheetSkill && selected && (
          <SkillSheet unit={selected} skill={sheetSkill} names={names} picking={Boolean(aiming)} onCancel={() => (aiming ? battle.cancel() : setPeek(null))}
            onUse={() => { setPeek(null); void battle.castSkill(sheetSkill, "self"); }} />
        )}
        {!preview && !sheetSkill && shown && <UnitCard unit={shown} names={names} stake={stakeOf(state, shown.id)} />}
        {!preview && !sheetSkill && !shown && hint && (
          <div className={`mx-auto flex items-center gap-2 rounded-full border border-border bg-bg-main/85 text-sm font-semibold text-text-secondary sm:mx-0 ${state.phase !== "player" ? "py-1 ps-4 pe-1" : "px-4"}`}>
            <span className="py-2">{hint}</span>
            {/* 적 차례를 지켜보는 동안 바로 곁에서 빠르게를 켤 수 있게 한다 */}
            {state.phase !== "player" && (
              <button type="button" onClick={speed.toggle} aria-pressed={speed.fast}
                className={`pointer-events-auto inline-flex min-h-11 items-center gap-1.5 rounded-full border px-3.5 ${speed.fast ? "border-accent bg-accent text-bg-main hover:bg-accent-hover" : "border-border text-text-primary hover:border-accent hover:text-accent"}`}>
                <FastForward className="h-4 w-4" aria-hidden />{t("hud.fast")}
              </button>
            )}
          </div>
        )}
        {showActions && selected && (
          <ActionBar state={state} unit={selected} interactables={interactablesFor(state, selected.id)} canCancel={Boolean(ui.undo) || ui.mode === "moved"}
            onSkill={(key, aim) => (aim === "target" ? void battle.castSkill(key, aim) : setPeek({ unitId: selected.id, skill: key }))} onInteract={(id) => void battle.act({ type: "interact", unitId: selected.id, interactableId: id })}
            onWait={() => void battle.act({ type: "wait", unitId: selected.id })} onCancel={battle.cancel} />
        )}
      </div>
      <BattleOverlays overlays={overlays} names={names} />
      {help && <HelpSheet onClose={() => setHelp(false)} />}
      {overlays.dialogue && <StoryPlayer scene={overlays.dialogue} names={names} onDone={overlays.close} overlay doneLabel={t("frame.close")} />}
    </div>
  );
}
