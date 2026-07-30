export type WanderEra = "ancient" | "medieval" | "earlyModern" | "revolution" | "modern";
export type WanderPower = "might" | "insight" | "support";
export type WanderPhase = "journey" | "return";
export type WanderEventKey =
  | "closedGate"
  | "hiddenSalon"
  | "burningArchive"
  | "marketRiot"
  | "stormHarbor"
  | "publicTrial"
  | "nightPursuit"
  | "farewellFeast";

export interface WanderFigure {
  id: string;
  name: string;
  title: string;
  nationality: string;
  avatarUrl: string | null;
  birthYear: number;
  deathYear: number;
  region: string;
  quote: string;
  totalScore: number;
  powers: Record<WanderPower, number>;
}

export type WanderPools = Record<WanderEra, WanderFigure[]>;
export type WanderStrengths = Record<WanderPower, number>;

export interface WanderBond {
  figure: WanderFigure;
  event: WanderEventKey;
  power: WanderPower;
  gain: number;
  penaltyPower: WanderPower;
  penalty: number;
}

export interface WanderState {
  era: WanderEra;
  phase: WanderPhase;
  round: number;
  journey: WanderFigure[];
  strengths: WanderStrengths;
  bonds: WanderBond[];
}

export interface WanderReturnResult {
  plan: WanderPower;
  score: number;
  threshold: number;
  victory: boolean;
  strongestBond: WanderBond | null;
  bestPlan: WanderPower;
  bestScore: number;
}
