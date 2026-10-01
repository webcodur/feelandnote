/*
  파일명: components/features/game/myth/troy/engine/index.ts
  기능: 트로이 전쟁 규칙 엔진 바깥 창구
  책임: 화면·장 자료가 쓰는 함수와 자료형을 한곳에서 내보낸다. 안쪽 파일을 직접 가져다 쓰지 않게 한다.
*/ // ------------------------------
export type * from "./types";
export type * from "./battleTypes";
export type * from "./forecastTypes";
export { TERRAIN_KINDS, DECOR_KINDS } from "./types";
export { createBattle, unitFromSpawn, unitFromRoster, statsAt, type RosterEntry } from "./spawn";
export { applyAction, beginBattle, sideDone, interactablesFor } from "./turn";
export { nextAiAction, runPhase, planPhase } from "./ai";
export { dangerTiles, threatTiles, targetsFrom, rangeFrom, standable } from "./aiScore";
export { forecast } from "./combat";
export { canUseSkill, skillTargets } from "./skills";
export { reachable, pathTo } from "./path";
export { checkOutcome } from "./rules";
export { unitAt, unitById, isOut, manhattan, allied, hasStatus } from "./grid";
export { CLASSES, SKILLS, WEAPONS, TERRAIN, BOND_TYPES, GATE_OPEN_FLAG } from "./tables";
