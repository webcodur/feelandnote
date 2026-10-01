/*
  파일명: components/features/game/myth/troy/ui/battle/useBattle.ts
  기능: 트로이 전쟁 한 판 진행
  책임: 판 상태를 쥐고, 누름을 행동으로 바꿔 규칙에 넘기고, 결과 연출이 끝나면 새 상태를 적는다.
        우리 차례가 끝나면 아군·적 AI를 한 수씩 연출하며 돌리고, 판이 끝나면 onEnd를, 우리 차례가 열릴 때마다 onSave를 부른다.
*/ // ------------------------------
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { applyAction, beginBattle, nextAiAction, sideDone } from "../../engine";
import type { Action, BattleEvent, BattleState, Point, SkillKey } from "../../engine";
import type { BoardView } from "../../scene/BoardView";
import { IDLE, tap, type BattleUi, type Command } from "./battleInput";
import { armyCenter, isPortrait, PORTRAIT_ZOOM } from "./camera";
import { playEvents, type DirectorHooks } from "./director";

interface Options {
  initial: BattleState;
  // 아직 시작 사건을 띄우지 않은 새 판인가(이어 하기면 false)
  fresh: boolean;
  hooks: Omit<DirectorHooks, "view">;
  onEnd: (state: BattleState) => void;
  onSave: (state: BattleState) => void;
}

const BUSY: BattleUi = { ...IDLE, mode: "busy" };

export function useBattle({ initial, fresh, hooks, onEnd, onSave }: Options) {
  const [state, setState] = useState(initial);
  const [ui, setUi] = useState<BattleUi>(BUSY);
  const [view, setView] = useState<BoardView | null>(null);
  const stateRef = useRef(initial);
  const hooksRef = useRef(hooks);
  const started = useRef(false);
  const ended = useRef(false);

  useEffect(() => {
    hooksRef.current = hooks;
  });

  const commit = useCallback((next: BattleState) => {
    stateRef.current = next;
    setState(next);
  }, []);

  const play = useCallback(async (events: BattleEvent[], before: BattleState, after: BattleState) => {
    if (!view) return;
    await playEvents(events, before, after, { ...hooksRef.current, view });
  }, [view]);

  // 행동 하나: 규칙 → 연출 → 새 상태. 받아들이지 않은 행동이면 false
  const apply = useCallback(async (action: Action) => {
    const before = stateRef.current;
    const result = applyAction(before, action);
    if (result.state === before) return { ok: false, events: [] as BattleEvent[] };
    stateRef.current = result.state;
    await play(result.events, before, result.state);
    commit(result.state);
    return { ok: true, events: result.events };
  }, [commit, play]);

  const finishIfOver = useCallback(() => {
    const s = stateRef.current;
    if (!s.outcome || ended.current) return false;
    ended.current = true;
    onEnd(s);
    return true;
  }, [onEnd]);

  // 우리 차례를 끝내고 아군·적 차례를 한 수씩 돌린 뒤 우리 차례로 돌아온다
  const runOpponents = useCallback(async () => {
    setUi(BUSY);
    await apply({ type: "endPhase" });
    for (let guard = 0; guard < 600; guard += 1) {
      const s = stateRef.current;
      if (s.outcome || s.phase === "player") break;
      const action = nextAiAction(s, s.phase);
      const done = await apply(action ?? { type: "endPhase" });
      if (!done.ok && action && action.type !== "endPhase") {
        const waited = await apply({ type: "wait", unitId: action.unitId });
        if (!waited.ok) await apply({ type: "endPhase" });
      }
    }
    if (finishIfOver()) return;
    onSave(stateRef.current);
    setUi(IDLE);
  }, [apply, finishIfOver, onSave]);

  // 우리 편이 모두 움직였으면 저절로 차례를 넘긴다
  const afterPlayerAct = useCallback(async () => {
    if (finishIfOver()) return;
    if (sideDone(stateRef.current, "player")) {
      await runOpponents();
      return;
    }
    setUi(IDLE);
  }, [finishIfOver, runOpponents]);

  // 뷰가 서면 판을 올리고, 새 판이면 시작 사건을 띄운다
  useEffect(() => {
    if (!view || started.current) return;
    started.current = true;
    const s = stateRef.current;
    void (async () => {
      await view.setMap(s.map, s.flags);
      view.setUnits(hooksRef.current.units(s));
      // 세로로 긴 화면은 판 전체가 작게 보이므로(칸이 손가락보다 작다) 다가가서 연다
      const portrait = isPortrait();
      if (portrait) view.zoomBy(PORTRAIT_ZOOM);
      if (portrait) view.focusOn(armyCenter(s), false);
      if (fresh) {
        const result = beginBattle(s);
        stateRef.current = result.state;
        await playEvents(result.events, s, result.state, { ...hooksRef.current, view });
        commit(result.state);
      }
      // 시작 사건이 카메라를 적장 쪽으로 옮겼으면 우리 편 앞으로 돌아온다
      if (portrait) view.focusOn(armyCenter(stateRef.current), true);
      if (finishIfOver()) return;
      onSave(stateRef.current);
      setUi(IDLE);
    })();
  }, [view, fresh, commit, finishIfOver, onSave]);

  const run = useCallback(async (command: Command, undoable: BattleState | null) => {
    if (command.kind === "move") {
      const r = await apply({ type: "move", unitId: command.unitId, to: command.to });
      // 움직이기만 했으면(사건이 없으면) 되돌릴 수 있다
      setUi({ ...IDLE, mode: "moved", selectedId: command.unitId, undo: r.events.every((e) => e.kind === "moved") ? undoable : null });
      finishIfOver();
      return;
    }
    if (command.kind === "attack" && command.from) await apply({ type: "move", unitId: command.unitId, to: command.from });
    await apply(command.kind === "attack"
      ? { type: "attack", unitId: command.unitId, targetId: command.targetId }
      : { type: "skill", unitId: command.unitId, skill: command.skill, targetId: command.targetId });
    await afterPlayerAct();
  }, [apply, afterPlayerAct, finishIfOver]);

  const onTile = useCallback((p: Point) => {
    const before = stateRef.current;
    const result = tap(before, ui, p);
    setUi(result.ui);
    if (result.command) void run(result.command, before);
  }, [ui, run]);

  // #region 행동 단추
  const act = useCallback(async (action: Action) => {
    setUi(BUSY);
    await apply(action);
    await afterPlayerAct();
  }, [apply, afterPlayerAct]);

  const castSkill = useCallback(async (skill: SkillKey, aim: "self" | "target") => {
    const id = ui.selectedId;
    if (!id) return;
    if (aim === "target") {
      setUi({ ...ui, mode: "skill", skill });
      return;
    }
    const keep = ui;
    setUi(BUSY);
    const r = await apply({ type: "skill", unitId: id, skill });
    const unit = stateRef.current.units.find((u) => u.id === id);
    if (r.ok && unit && !unit.acted) {
      setUi({ ...keep, mode: keep.mode === "busy" ? "moved" : keep.mode, undo: null });
      return;
    }
    await afterPlayerAct();
  }, [ui, apply, afterPlayerAct]);

  const cancel = useCallback(() => {
    if (ui.mode === "target" || ui.mode === "skill") {
      setUi({ ...ui, mode: stateRef.current.units.find((u) => u.id === ui.selectedId)?.moved ? "moved" : "selected", targetId: null, attackFrom: null, skill: null });
      return;
    }
    if (ui.undo && view) {
      commit(ui.undo);
      view.setUnits(hooksRef.current.units(ui.undo));
      setUi({ ...IDLE, mode: "selected", selectedId: ui.selectedId });
      return;
    }
    setUi(IDLE);
  }, [ui, view, commit]);
  // #endregion

  // 검수용: 우리 편도 AI로 한 차례 둔다(개발 서버의 캡처 도구만 부른다)
  const autoTurn = useCallback(async () => {
    setUi(BUSY);
    for (let i = 0; i < 60; i += 1) {
      const s = stateRef.current;
      const action = s.phase === "player" && !s.outcome ? nextAiAction(s, "player") : null;
      if (!action) break;
      if (!(await apply(action)).ok && "unitId" in action) await apply({ type: "wait", unitId: action.unitId });
    }
    await afterPlayerAct();
  }, [apply, afterPlayerAct]);

  return { state, ui, setUi, view, setView, onTile, act, castSkill, cancel, endTurn: runOpponents, autoTurn, busy: ui.mode === "busy" };
}
