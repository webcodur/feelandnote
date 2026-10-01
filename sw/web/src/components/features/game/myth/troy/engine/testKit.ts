/*
  파일명: components/features/game/myth/troy/engine/testKit.ts
  기능: 트로이 전쟁 엔진 시험 도구
  책임: 시험이 작은 장을 몇 줄로 세우게 돕는다(글자 지도, 장수 배치, 명단). 게임 화면은 쓰지 않는다.
*/ // ------------------------------
import { parseMap } from "../campaign/mapText";
import type { ChapterBattle, EventDef, LossRule, Objective, ChapterRule, Interactable } from "./battleTypes";
import type { RosterEntry } from "./spawn";
import type { Bond, ClassKey, Decor, UnitSpawn } from "./types";
import { statsAt } from "./spawn";

export function hero(slug: string, classKey: ClassKey, level: number, extra: Partial<RosterEntry> = {}): RosterEntry {
  return {
    slug, classKey, level, exp: 0, model: "hero", weapon: classKey === "archer" ? "bow" : "spear",
    skills: [], stats: statsAt(classKey, level), ...extra,
  };
}

export function foe(id: string, classKey: ClassKey, level: number, x: number, y: number, extra: Partial<UnitSpawn> = {}): UnitSpawn {
  return { id, side: "enemy", classKey, level, x, y, ...extra };
}

interface ChapterBits {
  rows: string[];
  heights?: string[];
  decor?: Decor[];
  deploy: { x: number; y: number }[];
  units?: UnitSpawn[];
  objective?: Objective;
  loss?: LossRule[];
  rules?: ChapterRule[];
  events?: EventDef[];
  interactables?: Interactable[];
}

export function chapter(bits: ChapterBits): ChapterBattle {
  return {
    id: "test",
    map: parseMap({ rows: bits.rows, heights: bits.heights, decor: bits.decor, mood: "day" }),
    deploy: bits.deploy,
    forced: [],
    available: [],
    maxDeploy: bits.deploy.length,
    units: bits.units ?? [],
    objective: bits.objective ?? { kind: "rout" },
    loss: bits.loss ?? [],
    rules: bits.rules ?? [],
    interactables: bits.interactables ?? [],
    events: bits.events ?? [],
  };
}

export const NO_BONDS: Bond[] = [];
