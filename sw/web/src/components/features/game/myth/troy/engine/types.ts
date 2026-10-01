/*
  파일명: components/features/game/myth/troy/engine/types.ts
  기능: 트로이 전쟁 전투 규칙의 자료형
  책임: 규칙(engine)·3D 판(scene)·화면(ui)·장 자료(campaign)가 같은 모양으로 판을 주고받게 하는 계약이다.
        수치 표는 여기 두지 않는다(engine/tables.ts). 판 상태는 JSON 그대로 저장·복원할 수 있어야 한다.
*/ // ------------------------------

// #region 판
export type Side = "player" | "ally" | "enemy";

export const TERRAIN_KINDS = [
  "plain", "sand", "road", "forest", "hill", "shallow", "water",
  "wall", "rampart", "gate", "camp", "ship", "trench", "palisade",
  "building", "temple", "stone", "ruins",
] as const;
export type TerrainKind = (typeof TERRAIN_KINDS)[number];

export interface Point {
  x: number;
  y: number;
}

// 칸 하나. 높이는 0~4단(3D에서 한 단 0.4). 판의 칸은 y * width + x 순서로 담는다
export interface Tile {
  terrain: TerrainKind;
  height: number;
}

// 칸 위에 따로 놓는 장식. 숲·언덕·성벽처럼 지형이 스스로 입는 장식은 3D 판이 알아서 놓는다
export const DECOR_KINDS = [
  "ship", "hut", "tent", "brazier", "altar", "statue", "horse", "column", "columnBroken",
  "spring", "tumulus", "shieldPile", "spearRack", "tower",
] as const;
export type DecorKind = (typeof DECOR_KINDS)[number];

// rot: 0=+y(아래)쪽을 봄, 1=+x, 2=-y, 3=-x. 배(ship)는 rot 방향으로 두 칸, 목마(horse)는 2×2를 덮는다
export interface Decor {
  kind: DecorKind;
  x: number;
  y: number;
  rot: 0 | 1 | 2 | 3;
}

export type Mood = "day" | "dusk" | "dawn" | "night";

export interface BattleMap {
  width: number;
  height: number;
  tiles: Tile[];
  decor: Decor[];
  mood: Mood;
}
// #endregion

// #region 장수
export interface Stats {
  hp: number;
  str: number;
  skl: number;
  spd: number;
  def: number;
  res: number;
  mov: number;
}
export type StatKey = keyof Stats;

export type MoveType = "foot" | "horse" | "wheels" | "flying";
export type ClassKey = "hoplite" | "archer" | "skirmisher" | "chariot" | "rider" | "healer" | "seer" | "god" | "river";
export type ModelKey =
  | "hoplite" | "hero" | "king" | "archer" | "skirmisher" | "chariot" | "rider" | "seer" | "healer"
  | "godWarrior" | "godArcher" | "godRobed" | "godTrident" | "riverGod";
export type WeaponKey = "spear" | "heroSpear" | "sword" | "bow" | "greatBow" | "javelin" | "staff" | "divine" | "flood";

// 상태의 turns는 그 장수 편의 차례가 시작될 때 1씩 준다. -1이면 사건이 풀 때까지 이어진다
export type StatusKey = "blessed" | "divineStrike" | "shaken" | "stripped" | "guarding" | "rooted" | "carrying" | "borrowedArmor" | "wrath";
export interface Status {
  key: StatusKey;
  turns: number;
}

export type SkillKey =
  // 쓰는 기술(행동을 쓰거나, free 기술은 행동 없이 한 판 한 번)
  | "wrath" | "athenaBlessing" | "warCry" | "cunning" | "counsel" | "heal" | "prophecy" | "blessing" | "shieldWall" | "aimedShot"
  // 늘 걸린 기술
  | "swiftFeet" | "sevenfoldShield" | "kingOfMen" | "shieldArcher" | "physician" | "trojanWall" | "apolloGuided"
  | "sonOfZeus" | "goddessRescue" | "longBow" | "filialGuard" | "dawnArmor" | "amazonQueen";

export type UnitTag = "lord" | "hero" | "boss" | "divine" | "invulnerable" | "noCounter";

export type AiMode = "charge" | "hold" | "guard" | "flee" | "seek" | "idle";
export interface AiPlan {
  mode: AiMode;
  // guard: 이 거리 안에 적이 들어오면 움직인다
  radius?: number;
  // 먼저 노리는 상대
  targetIds?: string[];
  // seek: 가려는 칸, flee: 멀어질 기준 칸(없으면 적에게서 멀어진다)
  goal?: Point[];
}

export interface Unit {
  id: string;
  // DB 인물 slug(이름·아바타·관계). 병사는 null이고 nameKey로 이름을 찾는다
  figureSlug: string | null;
  nameKey: string | null;
  side: Side;
  classKey: ClassKey;
  model: ModelKey;
  level: number;
  exp: number;
  stats: Stats;
  hp: number;
  weapon: WeaponKey;
  skills: SkillKey[];
  // 기술별 남은 대기(자기 차례 수). 0이거나 없으면 쓸 수 있다
  cooldowns: Partial<Record<SkillKey, number>>;
  // 한 판 한 번짜리 기술을 쓴 기록
  spent: SkillKey[];
  statuses: Status[];
  x: number;
  y: number;
  moved: boolean;
  acted: boolean;
  // 이번 차례에 쓴 이동 비용(전차 돌격 판정)
  moveUsed: number;
  ai: AiPlan | null;
  tags: UnitTag[];
  // 체력 비율이 이 값 아래로 떨어지면 판에서 물러난다(죽지 않는다)
  retreatBelow: number | null;
}

// 장 자료가 적는 모양. 빠진 값은 병과 기본값으로 채운다
export interface UnitSpawn {
  id: string;
  figureSlug?: string | null;
  nameKey?: string | null;
  side: Side;
  classKey: ClassKey;
  model?: ModelKey;
  level: number;
  stats?: Partial<Stats>;
  weapon?: WeaponKey;
  skills?: SkillKey[];
  statuses?: Status[];
  x: number;
  y: number;
  ai?: AiPlan | null;
  tags?: UnitTag[];
  retreatBelow?: number | null;
}
// #endregion

// #region 관계 — DB 관계에서 만든 값. a·b는 인물 slug
export type BondKind = "bond" | "rival";
export interface Bond {
  a: string;
  b: string;
  kind: BondKind;
  // DB 관계 유형(spouse·sibling·friend·rival…)
  type: string;
  note: string | null;
}
// #endregion
