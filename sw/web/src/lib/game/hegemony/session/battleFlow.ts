/*
  파일명: lib/game/hegemony/session/battleFlow.ts
  기능: 대전 단계 상태 전이
  책임: 라운드 시작(손패 복귀), 출전 확정(AI 결정), 공개 뒤 결산, 일기토 신청·결과, 다음 라운드를 처리한다.
*/

import { aiChoosePlay } from "../ai";
import { effectiveAptitude } from "../aptitude";
import { bestRecall, needsRecall, recallCandidates, recallCard } from "../hand";
import { mandateOfRound } from "../mandate";
import { resolveRound, verdictOf, winnerOf } from "../resolve";
import { rngFor } from "../rng";
import type { DuelWinner, Play } from "../types";
import type { ActionOf, BattleState, HegemonyState } from "./types";

/** 라운드를 연다 — 손패가 빈 AI는 바로 한 명을 불러오고, 플레이어는 후보를 받아 고른다 */
export function beginRound(seed: number, battle: BattleState): BattleState {
  const aiNeeds = needsRecall(battle.ai);
  const aiPick = aiNeeds ? bestRecall(recallCandidates(battle.ai, rngFor(seed, "recall-ai", battle.round))) : null;
  const ai = aiPick ? recallCard(battle.ai, aiPick.id) : battle.ai;
  const playerNeeds = needsRecall(battle.player);
  const recallOptions = playerNeeds ? recallCandidates(battle.player, rngFor(seed, "recall-player", battle.round)) : [];
  return { ...battle, ai, plays: null, recallOptions, step: playerNeeds ? "recall" : "plan" };
}

function withBattle(state: HegemonyState, battle: BattleState): HegemonyState {
  return { ...state, battle };
}

export function currentMandate(battle: BattleState) {
  return mandateOfRound(battle.mandates, battle.round);
}

export function onRecall(state: HegemonyState, action: ActionOf<"recall">): HegemonyState {
  const battle = state.battle;
  if (!battle || battle.step !== "recall" || !battle.recallOptions.some((c) => c.id === action.cardId)) return state;
  return withBattle(state, { ...battle, player: recallCard(battle.player, action.cardId), recallOptions: [], step: "plan" });
}

function isValidPlay(battle: BattleState, play: Play): boolean {
  if (!battle.player.hand.some((c) => c.id === play.cardId)) return false;
  return !play.recoverId || battle.player.used.some((c) => c.id === play.recoverId);
}

export function onLockIn(state: HegemonyState, action: ActionOf<"lockIn">): HegemonyState {
  const battle = state.battle;
  if (!battle || battle.step !== "plan" || !isValidPlay(battle, action.play)) return state;
  const aiPlay = aiChoosePlay(
    {
      difficulty: state.difficulty,
      round: battle.round,
      mandate: currentMandate(battle),
      self: battle.ai,
      opponent: battle.player,
      history: battle.records,
    },
    rngFor(state.seed, "ai-play", battle.round),
  );
  return withBattle(state, { ...battle, plays: { player: action.play, ai: aiPlay }, step: "reveal" });
}

/** 확정된 양측 출전이 같은 명령일 때 두 적성 (백분의 일 단위 정수) */
export function mirrorAptitudes(battle: BattleState): { mine: number; theirs: number } | null {
  const plays = battle.plays;
  if (!plays || verdictOf(plays.player.command, plays.ai.command) !== "draw") return null;
  const mandate = currentMandate(battle);
  const pCard = battle.player.hand.find((c) => c.id === plays.player.cardId);
  const aCard = battle.ai.hand.find((c) => c.id === plays.ai.cardId);
  if (!pCard || !aCard) return null;
  return {
    mine: Math.round(effectiveAptitude(pCard, plays.player.command, battle.player, mandate).value * 100),
    theirs: Math.round(effectiveAptitude(aCard, plays.ai.command, battle.ai, mandate).value * 100),
  };
}

/** 같은 명령 접전에서 적성이 밀리거나 같고, 일기토가 남아 있으면 신청 기회를 준다 */
export function canOfferDuel(battle: BattleState): boolean {
  const apts = mirrorAptitudes(battle);
  return !!apts && battle.player.duelsLeft > 0 && apts.mine <= apts.theirs;
}

function settle(battle: BattleState, duelWinner: DuelWinner | null): BattleState {
  const plays = battle.plays;
  if (!plays) return battle;
  const result = resolveRound({
    round: battle.round,
    mandate: currentMandate(battle),
    player: battle.player,
    ai: battle.ai,
    playerPlay: plays.player,
    aiPlay: plays.ai,
    duelWinner,
  });
  const player = duelWinner ? { ...result.player, duelsLeft: result.player.duelsLeft - 1 } : result.player;
  return {
    ...battle,
    player,
    ai: result.ai,
    records: [...battle.records, result.record],
    winner: winnerOf(result.player.nation, result.ai.nation, battle.round),
    step: "outcome",
  };
}

export function onRevealDone(state: HegemonyState): HegemonyState {
  const battle = state.battle;
  if (!battle || battle.step !== "reveal") return state;
  return withBattle(state, canOfferDuel(battle) ? { ...battle, step: "duelOffer" } : settle(battle, null));
}

export function onDuelAccept(state: HegemonyState): HegemonyState {
  const battle = state.battle;
  if (!battle || battle.step !== "duelOffer") return state;
  return withBattle(state, { ...battle, step: "duel" });
}

export function onDuelDecline(state: HegemonyState): HegemonyState {
  const battle = state.battle;
  if (!battle || battle.step !== "duelOffer") return state;
  return withBattle(state, settle(battle, null));
}

export function onDuelResult(state: HegemonyState, action: ActionOf<"duelResult">): HegemonyState {
  const battle = state.battle;
  if (!battle || battle.step !== "duel") return state;
  return withBattle(state, settle(battle, action.winner));
}

export function onNextRound(state: HegemonyState): HegemonyState {
  const battle = state.battle;
  if (!battle || battle.step !== "outcome") return state;
  if (battle.winner) return { ...state, phase: "result" };
  return withBattle(state, beginRound(state.seed, { ...battle, round: battle.round + 1 }));
}

/** 기권 — 이 판을 패배로 끝낸다 */
export function onForfeit(state: HegemonyState): HegemonyState {
  const battle = state.battle;
  if (state.phase !== "battle" || !battle) return state;
  return { ...state, phase: "result", battle: { ...battle, winner: "ai", forfeited: true } };
}
