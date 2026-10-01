/*
  파일명: lib/game/hegemony/resolve.ts
  기능: 라운드 결산
  책임: 양측 출전을 동시에 공개해 상성·적성으로 효과를 정하고, 국가·손패 변화와 구조화된 기록을 돌려준다.
        화면 문구는 만들지 않는다 — 기록을 받아 화면이 언어별로 그린다.
*/

import type { BattleCard, Command } from "../types";
import { BEATS, RULES, escalationOf, rebellionDamageOf } from "./constants";
import { effectiveAptitude, totalAptitude } from "./aptitude";
import type {
  DuelWinner, GameWinner, MirrorResolution, Nation, NationChange, Play, RoundRecord, SideOutcome, SideState, Verdict,
} from "./types";

export function verdictOf(mine: Command, theirs: Command): Verdict {
  if (mine === theirs) return "draw";
  return BEATS[mine] === theirs ? "win" : "lose";
}

interface Multipliers {
  player: number;
  ai: number;
  mirror: MirrorResolution | null;
}

const DUEL_MULTIPLIERS: Record<DuelWinner, { player: number; ai: number }> = {
  player: { player: RULES.mirrorWin, ai: 0 },
  ai: { player: 0, ai: RULES.mirrorWin },
  draw: { player: RULES.mirrorTie, ai: RULES.mirrorTie },
};

function multipliersOf(verdict: Verdict, playerApt: number, aiApt: number, duelWinner: DuelWinner | null): Multipliers {
  if (verdict === "win") return { player: RULES.counterWin, ai: 0, mirror: null };
  if (verdict === "lose") return { player: 0, ai: RULES.counterWin, mirror: null };
  if (duelWinner) return { ...DUEL_MULTIPLIERS[duelWinner], mirror: "duel" };
  // 소수점 끝자리 차이로 승부가 갈리지 않도록 백분의 일에서 비교한다
  const p = Math.round(playerApt * 100);
  const a = Math.round(aiApt * 100);
  if (p === a) return { player: RULES.mirrorTie, ai: RULES.mirrorTie, mirror: "tie" };
  return p > a
    ? { player: RULES.mirrorWin, ai: 0, mirror: "aptitude" }
    : { player: 0, ai: RULES.mirrorWin, mirror: "aptitude" };
}

/** 내정으로 불러올 인물: 지정한 인물, 없으면 적성 합이 가장 큰 인물 */
export function pickRecovery(used: readonly BattleCard[], recoverId?: string): BattleCard | null {
  if (used.length === 0) return null;
  const chosen = recoverId ? used.find((c) => c.id === recoverId) : undefined;
  return chosen ?? used.reduce((best, c) => (totalAptitude(c) > totalAptitude(best) ? c : best), used[0]);
}

function outcomeOf(card: BattleCard, play: Play, side: SideState, mandate: Command | null, multiplier: number, round: number): SideOutcome {
  const apt = effectiveAptitude(card, play.command, side, mandate);
  const escalation = escalationOf(round);
  const effect = (divisor: number, scale: number) =>
    multiplier === 0 ? 0 : Math.round(Math.round(apt.value / divisor) * multiplier * scale);
  const is = (command: Command) => play.command === command;
  const recovered = is("govern") ? pickRecovery(side.used, play.recoverId) : null;
  return {
    cardId: card.id,
    command: play.command,
    aptitude: apt.value,
    captain: apt.captain,
    mandate: apt.mandate,
    multiplier,
    dealtPower: is("assault") ? effect(RULES.offenseDivisor, escalation) : 0,
    dealtMorale: is("stratagem") ? effect(RULES.offenseDivisor, escalation) : 0,
    healedPower: is("govern") ? effect(RULES.governPowerDivisor, 1) : 0,
    healedMorale: is("govern") ? effect(RULES.governMoraleDivisor, 1) : 0,
    moraleCost: is("assault") ? RULES.assaultMoraleCost : 0,
    consumed: !is("govern"),
    recoveredId: recovered?.id ?? null,
  };
}

function applyNation(nation: Nation, own: SideOutcome, opp: SideOutcome, round: number): { nation: Nation; change: NationChange } {
  const rawMorale = nation.morale + own.healedMorale - own.moraleCost - opp.dealtMorale;
  // 민심이 0 아래로 넘친 만큼은 국력 피해로 옮겨 가고, 민심 0이면 반란이 일어난다
  const overflow = rawMorale < 0 ? -rawMorale : 0;
  const morale = Math.max(0, rawMorale);
  const rebellion = morale <= 0 ? rebellionDamageOf(round) : 0;
  const power = nation.power + own.healedPower - opp.dealtPower - overflow - rebellion;
  const next = { power: Math.min(power, RULES.maxPower), morale: Math.min(morale, RULES.maxMorale) };
  return {
    nation: next,
    change: { power: next.power - nation.power, morale: next.morale - nation.morale, overflow, rebellion },
  };
}

function moveCards(side: SideState, card: BattleCard, own: SideOutcome): Pick<SideState, "hand" | "used"> {
  const recovered = own.recoveredId ? side.used.find((c) => c.id === own.recoveredId) : undefined;
  const handAfterPlay = own.consumed ? side.hand.filter((c) => c.id !== card.id) : side.hand;
  const usedAfterPlay = own.consumed ? [...side.used, card] : side.used;
  if (!recovered) return { hand: handAfterPlay, used: usedAfterPlay };
  return {
    hand: [...handAfterPlay, recovered],
    used: usedAfterPlay.filter((c) => c.id !== recovered.id),
  };
}

function cardInHand(side: SideState, cardId: string): BattleCard {
  const card = side.hand.find((c) => c.id === cardId);
  if (!card) throw new Error(`[hegemony] 손패에 없는 인물은 출전할 수 없다: ${cardId}`);
  return card;
}

export interface RoundInput {
  round: number;
  mandate: Command | null;
  player: SideState;
  ai: SideState;
  playerPlay: Play;
  aiPlay: Play;
  duelWinner?: DuelWinner | null;
}

export interface RoundResult {
  record: RoundRecord;
  player: SideState;
  ai: SideState;
}

/** 동시 공개 라운드 결산 (순수 함수) */
export function resolveRound(input: RoundInput): RoundResult {
  const { round, mandate, player, ai, playerPlay, aiPlay } = input;
  const duelWinner = input.duelWinner ?? null;
  const pCard = cardInHand(player, playerPlay.cardId);
  const aCard = cardInHand(ai, aiPlay.cardId);
  const verdict = verdictOf(playerPlay.command, aiPlay.command);
  const mul = multipliersOf(
    verdict,
    effectiveAptitude(pCard, playerPlay.command, player, mandate).value,
    effectiveAptitude(aCard, aiPlay.command, ai, mandate).value,
    duelWinner,
  );
  const pOut = outcomeOf(pCard, playerPlay, player, mandate, mul.player, round);
  const aOut = outcomeOf(aCard, aiPlay, ai, mandate, mul.ai, round);
  const pNation = applyNation(player.nation, pOut, aOut, round);
  const aNation = applyNation(ai.nation, aOut, pOut, round);

  return {
    record: {
      round,
      mandate,
      escalation: escalationOf(round),
      verdict,
      mirror: mul.mirror,
      duelWinner,
      player: pOut,
      ai: aOut,
      change: { player: pNation.change, ai: aNation.change },
      after: { player: pNation.nation, ai: aNation.nation },
    },
    player: { ...player, ...moveCards(player, pCard, pOut), nation: pNation.nation },
    ai: { ...ai, ...moveCards(ai, aCard, aOut), nation: aNation.nation },
  };
}

/** 승부 판정. 한쪽 국력이 0 이하면 즉시, 마지막 라운드가 끝나면 국력 → 민심 순으로 비교한다 */
export function winnerOf(player: Nation, ai: Nation, round: number): GameWinner | null {
  const playerDown = player.power <= 0;
  const aiDown = ai.power <= 0;
  if (!playerDown && !aiDown && round < RULES.maxRounds) return null;
  if (playerDown !== aiDown) return playerDown ? "ai" : "player";
  if (player.power !== ai.power) return player.power > ai.power ? "player" : "ai";
  if (player.morale !== ai.morale) return player.morale > ai.morale ? "player" : "ai";
  return "draw";
}
