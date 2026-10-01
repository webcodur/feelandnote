/*
  파일명: lib/game/hegemony/draft.ts
  기능: 인재 선발
  책임: 15명 후보를 만들고, 3명씩 5묶음을 번갈아 뽑는 순서·진행·AI 선택을 담당한다.
        묶음마다 두 진영이 한 명씩 뽑고 남은 한 명은 제외된다. 묶음마다 먼저 뽑는 쪽이 바뀐다.
*/

import type { BattleCard, Command } from "../types";
import { COMMANDS } from "../types";
import { DIFFICULTY_PROFILE, DRAFT_POOL_SIZE, RULES, type Difficulty } from "./constants";
import { baseAptitude } from "./aptitude";
import { argMax, shuffle } from "./rng";
import type { Rng, Side } from "./types";

export interface DraftPick {
  side: Side;
  cardId: string;
}

export interface DraftState {
  pool: BattleCard[];
  order: Side[];
  picks: DraftPick[];
}

/** 명령별 최고 적성 */
function bestByCommand(cards: readonly BattleCard[]): Record<Command, number> {
  const best: Record<Command, number> = { assault: 0, stratagem: 0, govern: 0 };
  for (const card of cards) for (const cmd of COMMANDS) best[cmd] = Math.max(best[cmd], baseAptitude(card, cmd));
  return best;
}

function weakestCommand(cards: readonly BattleCard[]): Command {
  const best = bestByCommand(cards);
  return COMMANDS.reduce((a, b) => (best[a] <= best[b] ? a : b));
}

/** 14명은 순수 무작위, 마지막 한 명은 가장 약한 명령을 메울 인물로 채운다 */
export function buildDraftPool(all: readonly BattleCard[], rng: Rng): BattleCard[] {
  if (all.length <= DRAFT_POOL_SIZE) return shuffle(all, rng);
  const shuffled = shuffle(all, rng);
  const pool = shuffled.slice(0, DRAFT_POOL_SIZE - 1);
  const weakest = weakestCommand(pool);
  const rest = shuffled.slice(DRAFT_POOL_SIZE - 1).sort((a, b) => baseAptitude(b, weakest) - baseAptitude(a, weakest));
  pool.push(rest[Math.floor(rng() * Math.min(5, rest.length))]);
  return shuffle(pool, rng);
}

export function draftOrder(difficulty: Difficulty): Side[] {
  const aiFirst = DIFFICULTY_PROFILE[difficulty].aiFirst;
  return Array.from({ length: RULES.draftBatches }, (_, batch) => {
    const playerFirst = (batch % 2 === 0) !== aiFirst;
    return playerFirst ? (["player", "ai"] as Side[]) : (["ai", "player"] as Side[]);
  }).flat();
}

export function createDraft(pool: BattleCard[], difficulty: Difficulty): DraftState {
  return { pool, order: draftOrder(difficulty), picks: [] };
}

export function currentBatchIndex(draft: DraftState): number {
  return Math.min(Math.floor(draft.picks.length / 2), RULES.draftBatches - 1);
}

export function batchCards(draft: DraftState, batch: number): BattleCard[] {
  const start = batch * RULES.draftBatchSize;
  return draft.pool.slice(start, start + RULES.draftBatchSize);
}

export function currentPicker(draft: DraftState): Side | null {
  return draft.order[draft.picks.length] ?? null;
}

export function isDraftDone(draft: DraftState): boolean {
  return draft.picks.length >= draft.order.length;
}

export function pickedIds(draft: DraftState): Set<string> {
  return new Set(draft.picks.map((p) => p.cardId));
}

/** 지금 묶음에서 아직 뽑히지 않은 인물 */
export function availableCards(draft: DraftState): BattleCard[] {
  if (isDraftDone(draft)) return [];
  const taken = pickedIds(draft);
  return batchCards(draft, currentBatchIndex(draft)).filter((c) => !taken.has(c.id));
}

/** 두 번 다 뽑혀 끝난 묶음에서 남은(제외된) 인물 */
export function excludedIds(draft: DraftState): Set<string> {
  const taken = pickedIds(draft);
  const finished = Math.floor(draft.picks.length / 2);
  const out = new Set<string>();
  for (let b = 0; b < finished; b++) for (const c of batchCards(draft, b)) if (!taken.has(c.id)) out.add(c.id);
  return out;
}

export function picksOf(draft: DraftState, side: Side): BattleCard[] {
  const byId = new Map(draft.pool.map((c) => [c.id, c]));
  return draft.picks.filter((p) => p.side === side).flatMap((p) => byId.get(p.cardId) ?? []);
}

export function applyPick(draft: DraftState, side: Side, cardId: string): DraftState {
  if (currentPicker(draft) !== side) return draft;
  if (!availableCards(draft).some((c) => c.id === cardId)) return draft;
  return { ...draft, picks: [...draft.picks, { side, cardId }] };
}

/** 인물 한 명의 선발 가치 — 한 번에 한 명령만 쓰므로 가장 잘하는 명령에 무게를 둔다 */
function cardValue(card: BattleCard): number {
  const apts = COMMANDS.map((c) => baseAptitude(card, c)).sort((a, b) => b - a);
  return apts[0] + apts[1] * 0.45 + apts[2] * 0.15;
}

/** 명단의 가장 약한 명령을 메워 주는 만큼의 가치 */
function needValue(card: BattleCard, team: readonly BattleCard[]): number {
  if (team.length === 0) return 0;
  const weakest = weakestCommand(team);
  return Math.max(0, baseAptitude(card, weakest) - bestByCommand(team)[weakest]) * 0.6;
}

const DRAFT_NOISE: Record<Difficulty, number> = { easy: 4, normal: 1.2, hard: 0.3 };
/** 어려움은 상대에게 꼭 필요한 인물을 먼저 빼앗는다 */
const DENIAL_WEIGHT: Record<Difficulty, number> = { easy: 0, normal: 0.15, hard: 0.4 };

export function aiDraftPick(
  available: readonly BattleCard[],
  own: readonly BattleCard[],
  opponent: readonly BattleCard[],
  difficulty: Difficulty,
  rng: Rng,
): BattleCard {
  const scores = available.map((card) =>
    cardValue(card)
    + needValue(card, own)
    + (cardValue(card) + needValue(card, opponent)) * DENIAL_WEIGHT[difficulty]
    + (rng() - 0.5) * 2 * DRAFT_NOISE[difficulty],
  );
  return available[argMax(scores)];
}

/** 남은 선발을 양쪽 모두 AI 판단으로 끝낸다 (자동 선발) */
export function autoCompleteDraft(draft: DraftState, difficulty: Difficulty, rng: Rng): DraftState {
  let next = draft;
  while (!isDraftDone(next)) {
    const side = currentPicker(next);
    if (!side) break;
    const other: Side = side === "player" ? "ai" : "player";
    // 플레이어 몫은 난이도와 무관하게 보통 수준의 판단으로 채운다
    const level: Difficulty = side === "player" ? "normal" : difficulty;
    const pick = aiDraftPick(availableCards(next), picksOf(next, side), picksOf(next, other), level, rng);
    next = applyPick(next, side, pick.id);
  }
  return next;
}
