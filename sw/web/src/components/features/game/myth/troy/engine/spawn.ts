/*
  파일명: components/features/game/myth/troy/engine/spawn.ts
  기능: 트로이 전쟁 장수 만들기와 첫 판 세우기
  책임: 장 자료의 배치(UnitSpawn)와 원정 명단(RosterEntry)을 판 위 장수(Unit)로 바꾸고, 장 자료 + 출진 장수로 첫 판 상태를 세운다.
        명단에 있는 인물은 장 자료가 적은 수치 대신 명단의 수준·능력치로 나온다.
*/ // ------------------------------
import type { BattleState, ChapterBattle } from "./battleTypes";
import { CLASSES, type GrowthKey } from "./tables";
import type { Bond, ClassKey, ModelKey, Point, SkillKey, Stats, Unit, UnitSpawn, WeaponKey } from "./types";

// 원정 명단의 장수 한 명(화면의 RosterHero와 같은 모양)
export interface RosterEntry {
  slug: string;
  classKey: ClassKey;
  model: ModelKey;
  weapon: WeaponKey;
  skills: SkillKey[];
  level: number;
  exp: number;
  stats: Stats;
}

const MODEL_OF_CLASS: Record<ClassKey, ModelKey> = {
  hoplite: "hoplite", archer: "archer", skirmisher: "skirmisher", chariot: "chariot", rider: "rider",
  healer: "healer", seer: "seer", god: "godRobed", river: "riverGod",
};
const GROWTH_KEYS: GrowthKey[] = ["hp", "str", "skl", "spd", "def", "res"];

// 병과 1수준 값에 성장률만큼 더한 수준 L의 능력치
export function statsAt(classKey: ClassKey, level: number): Stats {
  const info = CLASSES[classKey];
  const out: Stats = { ...info.base };
  for (const key of GROWTH_KEYS) out[key] = info.base[key] + Math.round(((level - 1) * info.growth[key]) / 100);
  return out;
}

export function unitFromSpawn(spawn: UnitSpawn): Unit {
  const info = CLASSES[spawn.classKey];
  const stats: Stats = { ...statsAt(spawn.classKey, spawn.level), ...spawn.stats };
  return {
    id: spawn.id,
    figureSlug: spawn.figureSlug ?? null,
    nameKey: spawn.nameKey ?? null,
    side: spawn.side,
    classKey: spawn.classKey,
    model: spawn.model ?? MODEL_OF_CLASS[spawn.classKey],
    level: spawn.level,
    exp: 0,
    stats,
    hp: stats.hp,
    weapon: spawn.weapon ?? info.weapon,
    skills: spawn.skills ?? info.skills,
    cooldowns: {},
    spent: [],
    statuses: spawn.statuses ?? [],
    x: spawn.x,
    y: spawn.y,
    moved: false,
    acted: false,
    moveUsed: 0,
    ai: spawn.ai === undefined ? (spawn.side === "player" ? null : { mode: "charge" }) : spawn.ai,
    tags: spawn.tags ?? (spawn.figureSlug ? ["hero"] : []),
    retreatBelow: spawn.retreatBelow ?? null,
  };
}

// 명단의 장수를 at에 세운다. base가 있으면 그 배치의 자리·상태·태그를 쓴다
export function unitFromRoster(hero: RosterEntry, at: Point, base?: UnitSpawn): Unit {
  const unit = unitFromSpawn({
    ...base,
    id: base?.id ?? hero.slug,
    figureSlug: hero.slug,
    side: base?.side ?? "player",
    classKey: hero.classKey,
    model: hero.model,
    level: hero.level,
    stats: hero.stats,
    weapon: hero.weapon,
    skills: hero.skills,
    x: at.x,
    y: at.y,
    tags: base?.tags ?? ["hero"],
  });
  return { ...unit, exp: hero.exp, ai: base?.side && base.side !== "player" ? unit.ai : null };
}

function lordIds(chapter: ChapterBattle): string[] {
  return chapter.loss.flatMap((rule) => (rule.kind === "unitFalls" ? rule.unitIds : []));
}

// 장 자료 + 출진 장수(slug 차례) → 첫 판. 사건은 beginBattle이 띄운다
export function createBattle(chapter: ChapterBattle, deployed: string[], roster: RosterEntry[], bonds: Bond[], seed: number): BattleState {
  const bySlug = new Map(roster.map((hero) => [hero.slug, hero]));
  const placed = chapter.units.map((spawn) => {
    const hero = spawn.side === "player" && spawn.figureSlug ? bySlug.get(spawn.figureSlug) : undefined;
    return hero ? unitFromRoster(hero, spawn, spawn) : unitFromSpawn(spawn);
  });
  const taken = new Set(placed.map((u) => u.figureSlug ?? u.id));
  const free = chapter.deploy.filter((p) => !placed.some((u) => u.x === p.x && u.y === p.y));
  const heroes = deployed
    .filter((slug) => !taken.has(slug) && bySlug.has(slug))
    .slice(0, Math.min(chapter.maxDeploy, free.length))
    .map((slug, i) => unitFromRoster(bySlug.get(slug) as RosterEntry, free[i]));
  const lords = lordIds(chapter);
  // 쓰러뜨려야 이기는 적은 대장(boss)이다
  const bosses = chapter.objective.kind === "defeat" ? chapter.objective.unitIds : [];
  const tagged = (u: Unit, id: string[], tag: "lord" | "boss") => (id.includes(u.id) && !u.tags.includes(tag) ? { ...u, tags: [...u.tags, tag] } : u);
  const units = [...heroes, ...placed].map((u) => tagged(tagged(u, lords, "lord"), bosses, "boss"));
  return {
    chapterId: chapter.id,
    map: { ...chapter.map, tiles: chapter.map.tiles.map((t) => ({ ...t })), decor: chapter.map.decor.map((d) => ({ ...d })) },
    units,
    turn: 1,
    phase: "player",
    rng: seed >>> 0 || 1,
    flags: [],
    fired: [],
    events: chapter.events,
    objective: chapter.objective,
    loss: chapter.loss,
    rules: chapter.rules,
    interactables: chapter.interactables,
    bonds,
    clashed: [],
    retreated: [],
    fallen: [],
    removed: [],
    burned: [],
    expGained: {},
    outcome: null,
  };
}
