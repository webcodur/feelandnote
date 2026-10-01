/*
  파일명: components/features/game/myth/troy/engine/phase.ts
  기능: 트로이 전쟁 차례 넘김
  책임: 한 편의 차례를 끝내고 다음 편(player → ally → enemy → 다음 차례 player)의 차례를 연다.
        차례가 열릴 때 상태·기술 대기를 줄이고, 진영 회복·명의 회복·지키기(guard) 깨우기·차례 사건을 처리한다.
*/ // ------------------------------
import type { BattleEvent, BattleState } from "./battleTypes";
import { alliesNear, allied, hasSkill, manhattan, posOf, sideUnits, tileAt } from "./grid";
import { endOfRound, flood } from "./rules";
import { fireEvents } from "./events";
import { BONUS, TERRAIN } from "./tables";
import type { Side, Unit } from "./types";

function nextSide(state: BattleState, side: Side): { side: Side; turn: number } {
  const hasAllies = sideUnits(state, "ally").length > 0;
  if (side === "player") return { side: hasAllies ? "ally" : "enemy", turn: state.turn };
  if (side === "ally") return { side: "enemy", turn: state.turn };
  return { side: "player", turn: state.turn + 1 };
}

function heal(unit: Unit, amount: number, out: BattleEvent[]) {
  const gain = Math.min(unit.stats.hp - unit.hp, amount);
  if (gain <= 0) return;
  unit.hp += gain;
  out.push({ kind: "healed", unitId: unit.id, amount: gain, hp: unit.hp });
}

// 차례가 열리는 편의 장수를 정리한다
function openSide(state: BattleState, side: Side): BattleEvent[] {
  const out: BattleEvent[] = [];
  const mine = state.units.filter((u) => u.side === side);
  for (const unit of mine) {
    unit.moved = false;
    unit.acted = false;
    unit.moveUsed = 0;
    unit.statuses = unit.statuses.map((s) => (s.turns > 0 ? { ...s, turns: s.turns - 1 } : s)).filter((s) => s.turns !== 0);
    unit.cooldowns = Object.fromEntries(Object.entries(unit.cooldowns).map(([k, v]) => [k, Math.max(0, (v ?? 0) - 1)]));
    const tile = tileAt(state.map, posOf(unit));
    const campHeal = tile ? TERRAIN[tile.terrain].heal : 0;
    if (campHeal > 0) heal(unit, Math.ceil((unit.stats.hp * campHeal) / 100), out);
  }
  for (const unit of mine.filter((u) => hasSkill(u, "physician"))) {
    for (const friend of alliesNear(state, unit, posOf(unit), 1)) heal(friend, BONUS.physicianAura, out);
  }
  // 지키던 장수는 적이 가까이 오면 달려든다(한 번 깨면 그대로 둔다)
  for (const unit of mine) {
    const ai = unit.ai;
    if (ai?.mode !== "guard") continue;
    const radius = ai.radius ?? 3;
    const woke = state.units.some((u) => !allied(u.side, unit.side) && manhattan(posOf(u), posOf(unit)) <= radius);
    if (woke) unit.ai = { ...ai, mode: "charge" };
  }
  return out;
}

// 복제한 상태에서 지금 편의 차례를 끝내고 다음 편을 연다
export function endPhase(state: BattleState): BattleEvent[] {
  const out: BattleEvent[] = [];
  const ending = state.phase;
  // 이번 편 차례에만 걸리는 상태(분노 등, turns 0)를 거둔다
  for (const unit of state.units.filter((u) => u.side === ending)) unit.statuses = unit.statuses.filter((s) => s.turns !== 0);
  if (ending === "enemy") {
    out.push(...flood(state));
    state.flags = state.flags.filter((f) => f !== "intents");
    endOfRound(state);
    if (state.outcome) return [...out, { kind: "outcome", outcome: state.outcome }];
  }
  const next = nextSide(state, ending);
  state.phase = next.side;
  state.turn = next.turn;
  out.push({ kind: "phase", phase: next.side, turn: next.turn });
  out.push(...openSide(state, next.side));
  out.push(...fireEvents(state, { phase: { turn: next.turn, side: next.side } }));
  return out;
}

// 첫 판을 열 때: 시작 사건과 1차례 사건
export function openingEvents(state: BattleState): BattleEvent[] {
  return [...fireEvents(state, { start: true }), ...fireEvents(state, { phase: { turn: 1, side: "player" } })];
}
