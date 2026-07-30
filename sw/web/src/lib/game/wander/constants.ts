import type { WanderEra, WanderEventKey, WanderPower } from "./types";

export interface WanderEraDefinition {
  key: WanderEra;
  start: number;
  end: number;
}

export const WANDER_ERAS: WanderEraDefinition[] = [
  { key: "ancient", start: -3000, end: 500 },
  { key: "medieval", start: 501, end: 1499 },
  { key: "earlyModern", start: 1500, end: 1788 },
  { key: "revolution", start: 1789, end: 1913 },
  { key: "modern", start: 1914, end: 2100 },
];

export const WANDER_POWER_KEYS: WanderPower[] = ["might", "insight", "support"];
export const WANDER_ENCOUNTER_COUNT = 8;
export const WANDER_POOL_SIZE = 48;
export const WANDER_INITIAL_STRENGTH = 12;
export const WANDER_RETURN_THRESHOLD = 85;
export const WANDER_BOND_BONUS = 2;
export const WANDER_EVENT_BONUS = 4;

export const WANDER_EVENT_KEYS: WanderEventKey[] = [
  "closedGate",
  "hiddenSalon",
  "burningArchive",
  "marketRiot",
  "stormHarbor",
  "publicTrial",
  "nightPursuit",
  "farewellFeast",
];

export const WANDER_EVENT_FAVORS: Record<WanderEventKey, WanderPower> = {
  closedGate: "insight",
  hiddenSalon: "support",
  burningArchive: "insight",
  marketRiot: "support",
  stormHarbor: "might",
  publicTrial: "insight",
  nightPursuit: "might",
  farewellFeast: "support",
};

export const WANDER_TRADEOFFS: Record<WanderPower, { power: WanderPower; amount: number }> = {
  might: { power: "support", amount: 2 },
  insight: { power: "might", amount: 2 },
  support: { power: "insight", amount: 2 },
};

export const WANDER_REGION_KEYS = [
  "east_asia", "southeast_asia", "south_asia", "central_asia", "middle_east",
  "east_europe", "west_europe", "africa", "americas", "oceania",
] as const;
