import {
  WANDER_BOND_BONUS,
  WANDER_ENCOUNTER_COUNT,
  WANDER_EVENT_BONUS,
  WANDER_EVENT_FAVORS,
  WANDER_EVENT_KEYS,
  WANDER_INITIAL_STRENGTH,
  WANDER_POWER_KEYS,
  WANDER_RETURN_THRESHOLD,
  WANDER_TRADEOFFS,
} from "./constants";
import type {
  WanderBond,
  WanderEra,
  WanderEventKey,
  WanderFigure,
  WanderPower,
  WanderReturnResult,
  WanderState,
  WanderStrengths,
} from "./types";

function shuffled<T>(items: T[], random: () => number): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
}

export function createWanderState(
  era: WanderEra,
  pool: WanderFigure[],
  random: () => number = Math.random,
): WanderState | null {
  if (pool.length < WANDER_ENCOUNTER_COUNT) return null;
  const strengths: WanderStrengths = {
    might: WANDER_INITIAL_STRENGTH,
    insight: WANDER_INITIAL_STRENGTH,
    support: WANDER_INITIAL_STRENGTH,
  };
  return {
    era,
    phase: "journey",
    round: 0,
    journey: shuffled(pool, random).slice(0, WANDER_ENCOUNTER_COUNT),
    strengths,
    bonds: [],
  };
}

export function calculateBondGain(
  figure: WanderFigure,
  power: WanderPower,
  event: WanderEventKey,
): number {
  const eventBonus = WANDER_EVENT_FAVORS[event] === power ? WANDER_EVENT_BONUS : 0;
  return 7 + Math.round(figure.powers[power] / 10) + eventBonus;
}

export function resolveEncounter(state: WanderState, power: WanderPower): WanderState {
  const figure = state.journey[state.round];
  const event = WANDER_EVENT_KEYS[state.round];
  if (!figure || !event || state.phase !== "journey") return state;
  const gain = calculateBondGain(figure, power, event);
  const tradeoff = WANDER_TRADEOFFS[power];
  const bond: WanderBond = {
    figure, event, power, gain,
    penaltyPower: tradeoff.power,
    penalty: tradeoff.amount,
  };
  const round = state.round + 1;
  return {
    ...state,
    phase: round >= WANDER_ENCOUNTER_COUNT ? "return" : "journey",
    round,
    strengths: {
      ...state.strengths,
      [power]: state.strengths[power] + gain,
      [tradeoff.power]: Math.max(0, state.strengths[tradeoff.power] - tradeoff.amount),
    },
    bonds: [...state.bonds, bond],
  };
}

export function calculateReturnScore(state: WanderState, plan: WanderPower): number {
  const supportScore = WANDER_POWER_KEYS
    .filter((power) => power !== plan)
    .reduce((sum, power) => sum + Math.floor(state.strengths[power] / 4), 0);
  return state.strengths[plan] + supportScore + state.bonds.length * WANDER_BOND_BONUS;
}

export function getBestReturnPlan(state: WanderState): { plan: WanderPower; score: number } {
  return WANDER_POWER_KEYS
    .map((plan) => ({ plan, score: calculateReturnScore(state, plan) }))
    .reduce((best, current) => current.score > best.score ? current : best);
}

export function resolveReturn(state: WanderState, plan: WanderPower): WanderReturnResult {
  const score = calculateReturnScore(state, plan);
  const strongestBond = state.bonds
    .filter((bond) => bond.power === plan)
    .sort((a, b) => b.gain - a.gain)[0] ?? null;
  const best = getBestReturnPlan(state);
  return {
    plan,
    score,
    threshold: WANDER_RETURN_THRESHOLD,
    victory: score >= WANDER_RETURN_THRESHOLD,
    strongestBond,
    bestPlan: best.plan,
    bestScore: best.score,
  };
}
