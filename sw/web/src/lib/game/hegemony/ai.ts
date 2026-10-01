/*
  파일명: lib/game/hegemony/ai.ts
  기능: AI 판단
  책임: 플레이어의 선택을 모른 채 출전·주장·복귀를 정한다.
        플레이어가 낼 법한 수를 확률로 어림하고(합리성 + 최근 습관), 각 수의 기대 가치를 따져 고른다.
        난이도는 판단의 들쭉날쭉함(temperature)·습관 읽기 비중·실수 확률로만 갈린다.
*/

import type { BattleCard, Command } from "../types";
import { COMMANDS } from "../types";
import { DIFFICULTY_PROFILE, RULES, rebellionDamageOf, type Difficulty } from "./constants";
import { baseAptitude } from "./aptitude";
import { captainInHand } from "./hand";
import { pickRecovery, resolveRound, winnerOf, type RoundResult } from "./resolve";
import { argMax, pickOne, pickWeighted, softmax } from "./rng";
import type { Play, RoundRecord, Rng, Side, SideState } from "./types";

export interface AiView {
  difficulty: Difficulty;
  round: number;
  mandate: Command | null;
  /** AI 진영 */
  self: SideState;
  /** 플레이어 진영 */
  opponent: SideState;
  history: readonly RoundRecord[];
}

/** 승패가 갈린 결과의 가치 — 국력 만점의 두 배쯤으로 둬 결정타를 우선하되 다른 계산을 짓누르지 않게 한다 */
const TERMINAL_VALUE = 60;
/** 플레이어가 얼마나 합리적으로 둘지에 대한 AI의 가정 */
const PLAYER_TEMPERATURE = 1.6;
const HABIT_LOOKBACK = 4;

function optionsOf(side: SideState): Play[] {
  const recoverId = pickRecovery(side.used)?.id;
  return side.hand.flatMap((card) =>
    COMMANDS.map((command) => ({ cardId: card.id, command, recoverId: command === "govern" ? recoverId : undefined })),
  );
}

/** 한 진영 상태의 가치: 국력 + 민심(반란 위험 감안) + 손패 여유 + 주장 오라 */
function sideValue(side: SideState, nextRound: number): number {
  const { power, morale } = side.nation;
  const danger = morale <= 0 ? rebellionDamageOf(nextRound) + 2 : morale < RULES.moraleDanger ? (RULES.moraleDanger - morale) * 0.45 : 0;
  const aura = captainInHand(side) ? 1.5 : 0;
  return power + morale * 0.22 - danger + side.hand.length * 0.9 + aura;
}

function valueFor(side: Side, result: RoundResult, round: number): number {
  const winner = winnerOf(result.player.nation, result.ai.nation, round);
  if (winner) return winner === "draw" ? 0 : winner === side ? TERMINAL_VALUE : -TERMINAL_VALUE;
  const other: Side = side === "ai" ? "player" : "ai";
  return sideValue(result[side], round + 1) - sideValue(result[other], round + 1);
}

function simulate(view: AiView, aiPlay: Play, playerPlay: Play): RoundResult {
  return resolveRound({ round: view.round, mandate: view.mandate, player: view.opponent, ai: view.self, playerPlay, aiPlay });
}

/** 최근 몇 라운드 동안 플레이어가 낸 명령 비율 */
function habitOf(history: readonly RoundRecord[]): Record<Command, number> | null {
  const recent = history.slice(-HABIT_LOOKBACK);
  if (recent.length === 0) return null;
  const counts: Record<Command, number> = { assault: 0, stratagem: 0, govern: 0 };
  for (const r of recent) counts[r.player.command] += 1;
  return { assault: counts.assault / recent.length, stratagem: counts.stratagem / recent.length, govern: counts.govern / recent.length };
}

/** 플레이어가 각 수를 낼 확률 추정 */
function opponentModel(view: AiView, aiOptions: Play[], playerOptions: Play[]): number[] {
  const quality = playerOptions.map((pp) => {
    const values = aiOptions.map((ap) => valueFor("player", simulate(view, ap, pp), view.round));
    return values.reduce((a, b) => a + b, 0) / values.length;
  });
  const rational = softmax(quality, PLAYER_TEMPERATURE);
  const habit = habitOf(view.history);
  const weight = DIFFICULTY_PROFILE[view.difficulty].habitWeight;
  if (!habit || weight === 0) return rational;
  const perCommand = (cmd: Command) => playerOptions.filter((p) => p.command === cmd).length || 1;
  return rational.map((p, i) => {
    const cmd = playerOptions[i].command;
    return (1 - weight) * p + weight * (habit[cmd] / perCommand(cmd));
  });
}

/**
 * 이번 라운드 AI 출전.
 * 플레이어 수의 확률을 어림한 뒤 기대 가치에 비례해 고른다. 가장 좋은 수만 고집하면 읽히므로
 * 확률로 섞는다 — 시뮬레이션에서 들쭉날쭉함을 1 아래로 줄이면 오히려 상대 AI에게 읽혀 승률이 떨어졌다.
 */
export function aiChoosePlay(view: AiView, rng: Rng): Play {
  const aiOptions = optionsOf(view.self);
  const playerOptions = optionsOf(view.opponent);
  if (aiOptions.length === 0) throw new Error("[hegemony] AI 손패가 비어 있다");
  const profile = DIFFICULTY_PROFILE[view.difficulty];
  if (playerOptions.length === 0 || rng() < profile.blunder) return pickOne(aiOptions, rng);

  const odds = opponentModel(view, aiOptions, playerOptions);
  const expected = aiOptions.map((ap) =>
    playerOptions.reduce((sum, pp, j) => sum + odds[j] * valueFor("ai", simulate(view, ap, pp), view.round), 0),
  );
  return aiOptions[pickWeighted(softmax(expected, profile.temperature), rng)];
}

/**
 * AI 주장: 오라(손패에 남아 동료 +15%)와 본인 내정(×1.5, 내정은 손패에 남는다)을 함께 본다.
 * 약한 인물일수록 오라 몫이 커지고, 내정이 강하면 직접 나서도 손해가 적다.
 */
export function aiChooseCaptain(hand: readonly BattleCard[], rng: Rng): string {
  const best = (c: BattleCard) => Math.max(...COMMANDS.map((cmd) => baseAptitude(c, cmd)));
  const scores = hand.map((c) => {
    const others = hand.filter((o) => o.id !== c.id).reduce((sum, o) => sum + best(o), 0);
    return others * RULES.captainAura + baseAptitude(c, "govern") * 0.35 + rng() * 0.8;
  });
  return hand[argMax(scores)].id;
}
