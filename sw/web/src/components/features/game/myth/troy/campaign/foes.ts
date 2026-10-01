/*
  파일명: components/features/game/myth/troy/campaign/foes.ts
  기능: 트로이 전쟁 적·원군 장수 도우미
  책임: 트로이 장수·신·병사의 병과·모델·무기·기술·보정을 한 표로 두고, 장 자료가 `unit(키, id, 수준, x, y, 덧붙임)` 한 줄로 배치하게 한다.
        수치는 병과 수준값(statsAt)에 보정을 더한 값이다(게임이 지은 값).
*/ // ------------------------------
import { statsAt } from "../engine/spawn";
import type { AiPlan, ClassKey, ModelKey, Side, SkillKey, Stats, UnitSpawn, UnitTag, WeaponKey } from "../engine/types";

interface FoeKind {
  figureSlug?: string;
  nameKey?: string;
  classKey: ClassKey;
  model: ModelKey;
  weapon?: WeaponKey;
  skills?: SkillKey[];
  tags?: UnitTag[];
  boost?: Partial<Stats>;
  side?: Side;
}

const GOD: UnitTag[] = ["hero", "divine", "invulnerable"];

export const FOES = {
  // #region 트로이 장수
  hector: { figureSlug: "hector", classKey: "hoplite", model: "hero", weapon: "heroSpear", skills: ["trojanWall", "shieldWall"], tags: ["hero"], boost: { hp: 8, str: 3, skl: 3, spd: 3, def: 2, mov: 1 } },
  paris: { figureSlug: "paris", classKey: "archer", model: "archer", weapon: "greatBow", skills: ["apolloGuided", "aimedShot"], tags: ["hero"], boost: { skl: 2, spd: 1 } },
  aeneas: { figureSlug: "aeneas", classKey: "hoplite", model: "hero", skills: ["goddessRescue", "shieldWall"], tags: ["hero"], boost: { hp: 4, str: 2, def: 2 } },
  sarpedon: { figureSlug: "sarpedon-of-lycia", classKey: "hoplite", model: "hero", weapon: "heroSpear", skills: ["sonOfZeus"], tags: ["hero"], boost: { hp: 6, str: 2, def: 2 } },
  glaucus: { figureSlug: "glaucus", classKey: "hoplite", model: "hero", tags: ["hero"], boost: { hp: 3, str: 1, spd: 1 } },
  pandarus: { figureSlug: "pandarus", classKey: "archer", model: "archer", weapon: "greatBow", skills: ["longBow", "aimedShot"], tags: ["hero"], boost: { hp: 2, skl: 2 } },
  polydamas: { figureSlug: "polydamas", classKey: "hoplite", model: "hoplite", tags: ["hero"], boost: { hp: 2, skl: 2 } },
  deiphobus: { figureSlug: "deiphobus", classKey: "hoplite", model: "hero", skills: ["shieldWall"], tags: ["hero"], boost: { hp: 4, str: 2, def: 2 } },
  helenus: { figureSlug: "helenus", classKey: "seer", model: "seer", skills: ["blessing"], tags: ["hero"] },
  dolon: { figureSlug: "dolon", classKey: "skirmisher", model: "skirmisher", tags: ["hero"] },
  penthesilea: { figureSlug: "penthesilea", classKey: "rider", model: "rider", weapon: "heroSpear", skills: ["amazonQueen"], tags: ["hero"], boost: { hp: 8, str: 3, skl: 3, spd: 2, def: 2 } },
  memnon: { figureSlug: "memnon", classKey: "hoplite", model: "hero", weapon: "heroSpear", skills: ["dawnArmor"], tags: ["hero"], boost: { hp: 10, str: 3, skl: 2, def: 1, mov: 1 } },
  // #endregion
  // #region 신
  aphrodite: { figureSlug: "aphrodite", classKey: "god", model: "godRobed", tags: GOD },
  ares: { figureSlug: "ares", classKey: "god", model: "godWarrior", tags: GOD },
  apollo: { figureSlug: "apollo", classKey: "god", model: "godArcher", tags: GOD },
  poseidon: { figureSlug: "poseidon", classKey: "god", model: "godTrident", tags: GOD, side: "ally" },
  scamander: { figureSlug: "scamander", classKey: "river", model: "riverGod", tags: GOD },
  // #endregion
  // #region 병사
  "trojan-soldier": { nameKey: "trojan-soldier", classKey: "hoplite", model: "hoplite", skills: [] },
  "trojan-archer": { nameKey: "trojan-archer", classKey: "archer", model: "archer", skills: [] },
  "trojan-chariot": { nameKey: "trojan-chariot", classKey: "chariot", model: "chariot" },
  lycian: { nameKey: "lycian", classKey: "hoplite", model: "hoplite", skills: [] },
  amazon: { nameKey: "amazon", classKey: "rider", model: "rider" },
  aethiopian: { nameKey: "aethiopian", classKey: "skirmisher", model: "skirmisher" },
  "trojan-guard": { nameKey: "trojan-guard", classKey: "hoplite", model: "hoplite", skills: [] },
  myrmidon: { nameKey: "myrmidon", classKey: "hoplite", model: "hoplite", skills: ["shieldWall"], side: "player", boost: { hp: 2, str: 1 } },
  "achaean-soldier": { nameKey: "achaean-soldier", classKey: "hoplite", model: "hoplite", skills: [], side: "ally" },
  // 10장에서 성문으로 들어오는 아가멤논(아군)
  "agamemnon-host": { figureSlug: "agamemnon", classKey: "hoplite", model: "king", skills: ["kingOfMen", "shieldWall"], tags: ["hero"], side: "ally", boost: { hp: 4, str: 2, def: 2 } },
  // #endregion
} satisfies Record<string, FoeKind>;

export type FoeKey = keyof typeof FOES;

// 판에 말로 서는 DB 인물(얼굴 메달을 미리 만들 대상)
export const FOE_SLUGS: string[] = Object.values(FOES as Record<string, FoeKind>).flatMap((kind) => (kind.figureSlug ? [kind.figureSlug] : []));

export interface FoeExtra {
  ai?: AiPlan | null;
  tags?: UnitTag[];
  retreatBelow?: number | null;
  side?: Side;
  stats?: Partial<Stats>;
  statuses?: UnitSpawn["statuses"];
}

function addStats(base: Stats, boost: Partial<Stats> = {}, over: Partial<Stats> = {}): Stats {
  const out = { ...base };
  for (const key of Object.keys(boost) as (keyof Stats)[]) out[key] += boost[key] ?? 0;
  return { ...out, ...over };
}

// 표의 장수를 배치 한 줄로. id는 장 안에서 고유해야 한다(영웅은 보통 slug와 같게)
export function unit(key: FoeKey, id: string, level: number, x: number, y: number, extra: FoeExtra = {}): UnitSpawn {
  const kind: FoeKind = FOES[key];
  const side = extra.side ?? kind.side ?? "enemy";
  return {
    id,
    figureSlug: kind.figureSlug ?? null,
    nameKey: kind.nameKey ?? null,
    side,
    classKey: kind.classKey,
    model: kind.model,
    level,
    stats: addStats(statsAt(kind.classKey, level), kind.boost, extra.stats),
    weapon: kind.weapon,
    skills: kind.skills,
    statuses: extra.statuses,
    x,
    y,
    ai: extra.ai === undefined ? (side === "player" ? null : { mode: "charge" }) : extra.ai,
    tags: [...(kind.tags ?? []), ...(extra.tags ?? [])],
    retreatBelow: extra.retreatBelow ?? null,
  };
}

// 같은 병사 여럿을 한 번에(id 접두 + 번호)
export function squad(key: FoeKey, prefix: string, level: number, spots: [number, number][], extra: FoeExtra = {}): UnitSpawn[] {
  return spots.map(([x, y], i) => unit(key, `${prefix}-${i + 1}`, level, x, y, extra));
}
