/*
  파일명: components/features/game/myth/troy/campaign/progress.ts
  기능: 트로이 전쟁 원정 기록
  책임: 원정 기록(이긴 장·가장 빠른 판·영웅 수준·이야기 표지·싸우던 판)을 브라우저 localStorage에 읽고 쓰고,
        장마다 나설 수 있는 명단을 만든다. 판이 끝나면 영웅의 수준·능력치를 기록에 되돌려 적는다. 서버에 쓰는 값은 없다.
*/ // ------------------------------
import type { BattleState, RosterEntry } from "../engine";
import { CLASSES, EXP, type GrowthKey } from "../engine/tables";
import type { CampaignSave, HeroRecord } from "../model";
import { GONE_FLAG, HEROES, JOIN_CHAPTER } from "./heroes";
import { CHAPTERS, chapterById, type ChapterEntry } from "./index";

export const SAVE_KEY = "myth-troy:v1";

export function emptySave(): CampaignSave {
  return { version: 1, difficulty: "normal", cleared: [], bestTurns: {}, heroes: {}, flags: [], battle: null, updatedAt: Date.now() };
}

export function parseSave(raw: string | null): CampaignSave {
  try {
    const parsed = raw ? (JSON.parse(raw) as CampaignSave) : null;
    return parsed && parsed.version === 1 ? { ...emptySave(), ...parsed } : emptySave();
  } catch {
    return emptySave();
  }
}

export function loadSave(): CampaignSave {
  if (typeof window === "undefined") return emptySave();
  try {
    return parseSave(window.localStorage.getItem(SAVE_KEY));
  } catch {
    return emptySave();
  }
}

export function writeSave(save: CampaignSave) {
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify({ ...save, updatedAt: Date.now() }));
  } catch {
    // 저장 칸이 가득 찼거나 막혔다 — 판은 그대로 이어 간다
  }
}

// 이 장에 나설 수 있는 영웅(합류했고, 이야기상 떠나지 않은). 기록이 있으면 기록의 수준·능력치를 쓴다
export function rosterFor(entry: ChapterEntry, save: CampaignSave): RosterEntry[] {
  return HEROES.filter((hero) => (JOIN_CHAPTER[hero.slug] ?? 99) <= entry.no)
    .filter((hero) => !save.flags.includes(GONE_FLAG[hero.slug] ?? "—"))
    .map((hero) => {
      const record = save.heroes[hero.slug];
      return record ? { ...hero, level: record.level, exp: record.exp, stats: { ...record.stats } } : { ...hero, stats: { ...hero.stats } };
    });
}

// 출진 준비에서 고를 수 있는 영웅 slug(장 자료의 available ∩ 명단)
export function pickable(entry: ChapterEntry, save: CampaignSave): string[] {
  const roster = new Set(rosterFor(entry, save).map((hero) => hero.slug));
  return entry.battle.available.filter((slug) => roster.has(slug));
}

export function isUnlocked(save: CampaignSave, id: string): boolean {
  const i = CHAPTERS.findIndex((c) => c.id === id);
  return i === 0 || (i > 0 && save.cleared.includes(CHAPTERS[i - 1].id));
}

const GROWTH_KEYS: GrowthKey[] = ["hp", "str", "skl", "spd", "def", "res"];
// 진영에 남은 영웅이 받는 몫(나선 영웅이 얻은 경험 평균에 곱한다) — 반드시 나가야 하는 장에서 혼자 뒤처지지 않게
const BENCH_SHARE = 0.5;

function deployedHeroes(state: BattleState) {
  return [...state.units, ...state.removed].filter((u) => u.side === "player" && u.figureSlug && JOIN_CHAPTER[u.figureSlug]);
}

// 진영에 남은 영웅이 이 판에서 얻는 경험
export function benchExp(state: BattleState): number {
  const heroes = deployedHeroes(state);
  if (heroes.length === 0) return 0;
  return Math.round((heroes.reduce((n, u) => n + (state.expGained[u.id] ?? 0), 0) / heroes.length) * BENCH_SHARE);
}

// 진영에서 익힌 경험. 수준이 오르면 병과 성장률의 기댓값만큼 능력치를 올린다(판 위의 수준 오름과 달리 굴리지 않는다)
function train(hero: RosterEntry, amount: number, prev: HeroRecord | undefined): HeroRecord {
  const stats = { ...hero.stats };
  const growth = CLASSES[hero.classKey].growth;
  let { level, exp } = hero;
  exp += amount;
  while (exp >= EXP.levelAt && level < EXP.maxLevel) {
    exp -= EXP.levelAt;
    level += 1;
    for (const key of GROWTH_KEYS) stats[key] += Math.round(((level - 1) * growth[key]) / 100) - Math.round(((level - 2) * growth[key]) / 100);
  }
  return { slug: hero.slug, level, exp: level >= EXP.maxLevel ? 0 : exp, stats, battles: prev?.battles ?? 0, defeats: prev?.defeats ?? 0 };
}

// 이 판에 나서지 않고 진영에 남은 원정대 영웅(slug). 판을 적기 전의 기록으로 부른다
export function benchHeroes(save: CampaignSave, state: BattleState): string[] {
  const entry = chapterById(state.chapterId);
  const deployed = new Set(deployedHeroes(state).map((u) => u.figureSlug));
  return entry ? rosterFor(entry, save).map((h) => h.slug).filter((slug) => !deployed.has(slug)) : [];
}

// 이긴 판을 기록에 적는다. 쓰러진 장수도 수준·경험은 남기고, 진영에 남은 영웅도 몫을 받는다
export function recordVictory(save: CampaignSave, state: BattleState): CampaignSave {
  const entry = chapterById(state.chapterId);
  const heroes: Record<string, HeroRecord> = { ...save.heroes };
  const deployed = deployedHeroes(state);
  const bench = benchExp(state);
  const staying = new Set(benchHeroes(save, state));
  for (const hero of entry ? rosterFor(entry, save) : []) {
    if (bench > 0 && staying.has(hero.slug)) heroes[hero.slug] = train(hero, bench, save.heroes[hero.slug]);
  }
  for (const unit of deployed) {
    if (!unit.figureSlug) continue;
    const prev = heroes[unit.figureSlug];
    heroes[unit.figureSlug] = {
      slug: unit.figureSlug, level: unit.level, exp: unit.exp, stats: { ...unit.stats },
      battles: (prev?.battles ?? 0) + 1, defeats: (prev?.defeats ?? 0) + (state.fallen.includes(unit.id) ? 1 : 0),
    };
  }
  const flags = [...new Set([...save.flags, ...(entry?.flagsAfterWin?.(state) ?? [])])];
  const best = save.bestTurns[state.chapterId];
  return {
    ...save,
    heroes,
    flags,
    cleared: save.cleared.includes(state.chapterId) ? save.cleared : [...save.cleared, state.chapterId],
    bestTurns: { ...save.bestTurns, [state.chapterId]: best ? Math.min(best, state.turn) : state.turn },
    battle: null,
  };
}

// 이어 할 장: 싸우던 판이 있으면 그 장, 아니면 아직 넘지 않은 첫 장
export function resumeChapter(save: CampaignSave): ChapterEntry {
  const fighting = save.battle ? chapterById(save.battle.chapterId) : null;
  return fighting ?? CHAPTERS.find((c) => !save.cleared.includes(c.id)) ?? CHAPTERS[CHAPTERS.length - 1];
}
