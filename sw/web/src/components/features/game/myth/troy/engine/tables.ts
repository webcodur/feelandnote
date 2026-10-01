/*
  파일명: components/features/game/myth/troy/engine/tables.ts
  기능: 트로이 전쟁 규칙 수치 표
  책임: 지형·무기·병과·기술·보정·경험치 수치를 한곳에 둔다(게임이 지은 값). 규칙 파일은 수치를 여기서만 읽는다.
*/ // ------------------------------
import type { ClassKey, MoveType, SkillKey, StatKey, Stats, TerrainKind, WeaponKey } from "./types";

// #region 지형
export interface TerrainInfo {
  // 이동 비용. null이면 지나갈 수 없다
  cost: Record<MoveType, number | null>;
  def: number;
  avoid: number;
  // 제 편 차례 시작에 최대 체력의 몇 %를 되찾나
  heal: number;
}

const ground = (foot: number | null, horse: number | null, wheels: number | null, flying: number | null, def = 0, avoid = 0, heal = 0): TerrainInfo => ({
  cost: { foot, horse, wheels, flying }, def, avoid, heal,
});

export const TERRAIN: Record<TerrainKind, TerrainInfo> = {
  plain: ground(1, 1, 1, 1),
  sand: ground(1, 2, 2, 1),
  road: ground(1, 1, 1, 1),
  forest: ground(2, 3, null, 1, 1, 20),
  hill: ground(2, 3, 4, 1, 1, 15),
  shallow: ground(3, 4, null, 1, 0, -10),
  water: ground(null, null, null, 1),
  wall: ground(null, null, null, null),
  rampart: ground(1, null, null, 1, 2, 20),
  gate: ground(1, 1, 1, 1, 1, 10),
  camp: ground(1, 1, 1, 1, 1, 10, 10),
  ship: ground(null, null, null, 1),
  trench: ground(3, null, null, 1, 0, -10),
  palisade: ground(null, null, null, 1),
  building: ground(null, null, null, null),
  temple: ground(1, 1, null, 1, 1, 10),
  stone: ground(1, 1, 1, 1),
  ruins: ground(2, 3, null, 1, 1, 15),
};

// 성문 칸은 이 표지가 켜져야 지나간다
export const GATE_OPEN_FLAG = "gate-open";
// 한 걸음에 오르내릴 수 있는 높이(단)
export const MAX_CLIMB = 1;
// #endregion

// #region 무기
export interface WeaponInfo {
  might: number;
  hit: number;
  crit: number;
  // 사거리. max가 0이면 칠 수 없다(지팡이)
  min: number;
  max: number;
  // str 대신 res로 치고, 상대 def 대신 res로 막는다
  magic: boolean;
  bow: boolean;
}

const weapon = (might: number, hit: number, crit: number, min: number, max: number, magic = false, bow = false): WeaponInfo => ({ might, hit, crit, min, max, magic, bow });

export const WEAPONS: Record<WeaponKey, WeaponInfo> = {
  spear: weapon(5, 85, 0, 1, 1),
  heroSpear: weapon(7, 90, 5, 1, 1),
  sword: weapon(4, 90, 5, 1, 1),
  bow: weapon(5, 80, 5, 2, 3, false, true),
  greatBow: weapon(6, 85, 10, 2, 3, false, true),
  javelin: weapon(4, 80, 0, 1, 2),
  staff: weapon(0, 0, 0, 0, 0),
  divine: weapon(8, 95, 5, 1, 2, true),
  flood: weapon(7, 90, 0, 1, 2, true),
};
// #endregion

// #region 병과
export type GrowthKey = Exclude<StatKey, "mov">;

export interface ClassInfo {
  move: MoveType;
  weapon: WeaponKey;
  base: Stats;
  growth: Record<GrowthKey, number>;
  skills: SkillKey[];
}

const stats = (hp: number, str: number, skl: number, spd: number, def: number, res: number, mov: number): Stats => ({ hp, str, skl, spd, def, res, mov });
const growth = (hp: number, str: number, skl: number, spd: number, def: number, res: number): Record<GrowthKey, number> => ({ hp, str, skl, spd, def, res });
const NO_GROWTH = growth(0, 0, 0, 0, 0, 0);

export const CLASSES: Record<ClassKey, ClassInfo> = {
  hoplite: { move: "foot", weapon: "spear", base: stats(20, 6, 5, 4, 6, 1, 4), growth: growth(80, 50, 45, 35, 45, 15), skills: ["shieldWall"] },
  archer: { move: "foot", weapon: "bow", base: stats(16, 5, 7, 6, 3, 2, 4), growth: growth(65, 45, 55, 50, 25, 25), skills: ["aimedShot"] },
  skirmisher: { move: "foot", weapon: "javelin", base: stats(17, 5, 6, 7, 3, 2, 5), growth: growth(70, 45, 50, 60, 30, 20), skills: [] },
  chariot: { move: "wheels", weapon: "spear", base: stats(19, 6, 5, 6, 5, 1, 7), growth: growth(70, 50, 45, 45, 40, 10), skills: [] },
  rider: { move: "horse", weapon: "spear", base: stats(18, 6, 6, 8, 4, 3, 6), growth: growth(70, 50, 50, 60, 30, 25), skills: [] },
  healer: { move: "foot", weapon: "sword", base: stats(16, 3, 6, 5, 3, 5, 4), growth: growth(60, 30, 50, 45, 25, 45), skills: ["heal"] },
  seer: { move: "foot", weapon: "staff", base: stats(14, 1, 5, 5, 2, 8, 4), growth: growth(55, 5, 40, 45, 15, 60), skills: ["prophecy", "blessing"] },
  god: { move: "flying", weapon: "divine", base: stats(40, 10, 12, 10, 10, 14, 5), growth: NO_GROWTH, skills: [] },
  river: { move: "flying", weapon: "flood", base: stats(50, 0, 12, 6, 12, 14, 0), growth: NO_GROWTH, skills: [] },
};
// #endregion

// #region 기술
export type SkillUse = "free" | "action" | "passive";
export type SkillAim = "self" | "ally" | "enemy" | "none";

export interface SkillInfo {
  use: SkillUse;
  aim: SkillAim;
  range: [number, number];
  // 쓴 뒤 기다릴 자기 차례 수
  cooldown: number;
  // 한 판 한 번
  once: boolean;
}

const active = (use: SkillUse, aim: SkillAim, range: [number, number], cooldown: number, once = false): SkillInfo => ({ use, aim, range, cooldown, once });
const PASSIVE: SkillInfo = active("passive", "none", [0, 0], 0);

export const SKILLS: Record<SkillKey, SkillInfo> = {
  wrath: active("free", "self", [0, 0], 0, true),
  athenaBlessing: active("free", "self", [0, 0], 0, true),
  warCry: active("action", "none", [1, 2], 3),
  cunning: active("action", "ally", [1, 3], 3),
  counsel: active("action", "ally", [1, 1], 0, true),
  heal: active("action", "ally", [1, 1], 0),
  prophecy: active("action", "none", [0, 0], 2),
  blessing: active("action", "ally", [1, 2], 1),
  shieldWall: active("action", "self", [0, 0], 2),
  aimedShot: active("action", "enemy", [0, 0], 2),
  swiftFeet: PASSIVE, sevenfoldShield: PASSIVE, kingOfMen: PASSIVE, shieldArcher: PASSIVE, physician: PASSIVE,
  trojanWall: PASSIVE, apolloGuided: PASSIVE, sonOfZeus: PASSIVE, goddessRescue: PASSIVE, longBow: PASSIVE,
  filialGuard: PASSIVE, dawnArmor: PASSIVE, amazonQueen: PASSIVE,
};
// #endregion

// #region 보정·경험치
export const BONUS = {
  bondHit: 10, bondAvoid: 10, bondDef: 1, rivalCrit: 15,
  blessedHit: 15, blessedCrit: 10, shakenHit: -15, guardingDef: 3, guardAuraDef: 1, borrowedArmorHit: -20,
  heightHit: 10, heightMight: 1, wrathStr: 4, chargeMight: 2, chargeMove: 4, aimedHit: 20, aimedCrit: 10,
  sevenfold: 2, sonOfZeus: 1, kingOfMenHit: 5, shieldArcher: 3, filialMight: 2, filialHit: 10, dawnDef: 3,
  amazonMight: 2, trojanWallDef: 1, trojanWallAvoid: 10, apolloCrit: 15,
  healBase: 8, physicianHeal: 5, physicianAura: 3, doubleSpeed: 4, critMult: 2,
  floodTiles: 6, floodDamage: 5, carryingMov: 2,
} as const;

export const EXP = { hit: 16, killBase: 45, killDiff: 3, killMin: 15, killMax: 80, boss: 30, support: 20, levelAt: 100, maxLevel: 20 } as const;

// 인연으로 치는 DB 관계 유형(대응 신격·영향은 뺀다)
export const BOND_TYPES = ["spouse", "partner", "sibling", "parent", "father", "mother", "friend", "teacher", "colleague", "relative"] as const;
// #endregion
