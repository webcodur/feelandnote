/*
  파일명: components/features/game/myth/troy/engine/battleTypes.ts
  기능: 트로이 전쟁 한 판의 상태·목표·사건·행동 자료형
  책임: 규칙이 판을 넘기는 모양(BattleState), 장 자료가 적는 모양(ChapterBattle),
        화면이 연출할 결과(BattleEvent)를 한곳에서 정한다. 모두 JSON으로 저장할 수 있는 값만 담는다.
*/ // ------------------------------
import type { BattleMap, Bond, Point, Side, SkillKey, Status, TerrainKind, Unit, UnitSpawn, AiPlan } from "./types";

// #region 목표·패배 조건
export type Objective =
  | { kind: "rout" }
  | { kind: "defeat"; unitIds: string[] }
  | { kind: "survive"; turns: number }
  // unitIds 가운데 하나가 tiles 가운데 한 칸에 서면 이긴다
  | { kind: "reach"; unitIds: string[]; tiles: Point[] };

export type LossRule =
  | { kind: "unitFalls"; unitIds: string[] }
  | { kind: "turnLimit"; turns: number }
  | { kind: "enemyReaches"; tiles: Point[]; unitIds?: string[] }
  | { kind: "flag"; flag: string };
// #endregion

// #region 장마다 다른 규칙
export interface ShipSpot {
  id: string;
  tiles: Point[];
}

export type ChapterRule =
  // 적이 배 곁에서 차례를 마치면 배가 탄다. lossAt척이 타면 진다
  | { kind: "burnShips"; ships: ShipSpot[]; lossAt: number }
  // 적 차례가 끝날 때마다 물이 번진다. stopFlag가 켜지면 멈춘다
  | { kind: "flood"; stopFlag: string }
  // unitId가 tiles에 들어서면 flag를 켠다(파트로클로스와 성벽)
  | { kind: "zone"; unitId: string; tiles: Point[]; flag: string }
  // 서로 다른 편의 벗은 서로 치지 않는다(디오메데스와 글라우코스, 『일리아스』 6권)
  | { kind: "truce"; pairs: [string, string][] };

// 서 있거나 곁에 선 장수가 행동으로 켜는 자리(성문 열기 등)
export interface Interactable {
  id: string;
  tiles: Point[];
  labelKey: string;
  flag: string;
  side: Side;
}
// #endregion

// #region 사건
export type Trigger =
  | { on: "start" }
  | { on: "turn"; turn: number; phase?: Side }
  // 쓰러짐(fell)만. 물러남은 retreated로 따로 받는다
  | { on: "defeated"; unitId: string }
  | { on: "retreated"; unitId: string }
  | { on: "hpBelow"; unitId: string; ratio: number }
  | { on: "reach"; unitIds: string[]; tiles: Point[] }
  | { on: "adjacent"; a: string; b: string }
  | { on: "flag"; flag: string };

export type EventAction =
  | { do: "scene"; sceneId: string }
  | { do: "spawn"; units: UnitSpawn[] }
  | { do: "retreat"; unitId: string }
  // unitIds에 "@player"·"@ally"·"@enemy"를 쓰면 그 편 전부다
  | { do: "status"; unitIds: string[]; status: Status }
  | { do: "clearStatus"; unitIds: string[]; key: Status["key"] }
  | { do: "terrain"; tiles: Point[]; terrain: TerrainKind; height?: number }
  | { do: "flag"; flag: string }
  | { do: "objective"; objective: Objective }
  | { do: "ai"; unitIds: string[]; ai: AiPlan }
  | { do: "kill"; unitId: string }
  | { do: "heal"; unitIds: string[]; amount: number }
  // 지금 체력을 최대치의 ratio로 맞춘다(다친 채 싸움에 나선 장수). 1 아래로는 내리지 않는다
  | { do: "hp"; unitIds: string[]; ratio: number }
  | { do: "focus"; tile: Point }
  | { do: "victory" }
  | { do: "defeat" };

export interface EventDef {
  id: string;
  when: Trigger;
  ifFlag?: string;
  ifNotFlag?: string;
  actions: EventAction[];
}
// #endregion

// #region 장 자료 → 판
export interface ChapterBattle {
  id: string;
  map: BattleMap;
  // 고른 장수를 세우는 칸(차례대로 채운다)
  deploy: Point[];
  // 반드시 나가는 장수(slug). 나머지는 고른다
  forced: string[];
  // 이 장에 고를 수 있는 장수(slug). forced도 여기 든다. 이야기상 빠진 장수(막사의 아킬레우스 등)는 넣지 않는다
  available: string[];
  maxDeploy: number;
  units: UnitSpawn[];
  objective: Objective;
  loss: LossRule[];
  rules: ChapterRule[];
  interactables: Interactable[];
  events: EventDef[];
}

export interface BattleState {
  chapterId: string;
  map: BattleMap;
  units: Unit[];
  turn: number;
  phase: Side;
  // mulberry32 상태. 판을 저장하면 같은 결과가 이어진다
  rng: number;
  flags: string[];
  fired: string[];
  events: EventDef[];
  objective: Objective;
  loss: LossRule[];
  rules: ChapterRule[];
  interactables: Interactable[];
  bonds: Bond[];
  // 맞수 장면을 이미 본 쌍("a|b", slug 사전순)
  clashed: string[];
  // 판에서 빠진 장수 — 물러남(retreated)과 쓰러짐(fallen)을 가른다. 빠진 장수의 마지막 모습은 removed에 남긴다(결과 화면의 수준·경험치)
  retreated: string[];
  fallen: string[];
  removed: Unit[];
  burned: string[];
  expGained: Record<string, number>;
  outcome: "victory" | "defeat" | null;
}
// #endregion

// #region 행동과 결과
export type Action =
  | { type: "move"; unitId: string; to: Point }
  | { type: "attack"; unitId: string; targetId: string }
  | { type: "skill"; unitId: string; skill: SkillKey; targetId?: string; tile?: Point }
  | { type: "interact"; unitId: string; interactableId: string }
  | { type: "wait"; unitId: string }
  | { type: "endPhase" };

export interface Strike {
  attackerId: string;
  targetId: string;
  hit: boolean;
  crit: boolean;
  damage: number;
  targetHp: number;
}

export interface LevelUp {
  unitId: string;
  level: number;
  gains: Partial<Record<keyof Unit["stats"], number>>;
}

// 화면이 차례대로 연출하는 결과. 규칙은 상태를 이미 바꾼 뒤 이 목록을 돌려준다
export type BattleEvent =
  | { kind: "moved"; unitId: string; path: Point[] }
  | { kind: "combat"; attackerId: string; defenderId: string; ranged: boolean; strikes: Strike[] }
  | { kind: "skill"; unitId: string; skill: SkillKey; targetIds: string[]; tile?: Point }
  | { kind: "healed"; unitId: string; amount: number; hp: number }
  | { kind: "status"; unitId: string; status: Status }
  | { kind: "fell"; unitId: string }
  | { kind: "retreated"; unitId: string }
  | { kind: "spawned"; unitIds: string[] }
  | { kind: "terrain"; tiles: Point[] }
  | { kind: "shipBurned"; shipId: string }
  | { kind: "flooded"; tiles: Point[]; swept: string[] }
  | { kind: "exp"; unitId: string; amount: number }
  | { kind: "levelUp"; levelUp: LevelUp }
  | { kind: "rivalClash"; a: string; b: string; note: string | null }
  | { kind: "truce"; a: string; b: string }
  | { kind: "scene"; sceneId: string }
  | { kind: "focus"; tile: Point }
  | { kind: "phase"; phase: Side; turn: number }
  | { kind: "outcome"; outcome: "victory" | "defeat" };

export interface ActionResult {
  state: BattleState;
  events: BattleEvent[];
}
// #endregion
