/**
 * 교차 격자 (Crossing Grid) 게임 타입
 * 3×3 격자의 행·열 조건을 동시에 만족하는 인물을 입력하는 게임
 */

/** 조건 축 종류 */
export type ConditionAxis = "nationality" | "profession" | "century" | "tag";

/** 하나의 조건 */
export interface GridCondition {
  axis: ConditionAxis;
  value: string;
  label: string;
  labelEn: string;
}

/** 격자 한 칸 상태 */
export interface GridCell {
  row: number;
  col: number;
  /** 유저가 입력한 정답 인물 id (또는 null) */
  answerId: string | null;
  /** 정답 여부 */
  correct: boolean | null;
}

/** 자동완성 후보 인물 */
export interface GridCeleb {
  id: string;
  nickname: string;
  nicknameEn: string;
  slug: string;
  nationality: string | null;
  profession: string | null;
  birthDate: string | null;
  deathDate: string | null;
  /** 소속 태그 id 목록 */
  tagIds: string[];
}

/** 서버에서 생성한 출제 데이터 */
export interface GridPuzzle {
  /** 행 조건 3개 */
  rowConditions: [GridCondition, GridCondition, GridCondition];
  /** 열 조건 3개 */
  colConditions: [GridCondition, GridCondition, GridCondition];
  /** 각 칸(row, col)에 대해 정답이 될 수 있는 인물 id 집합 */
  answers: Record<string, string[]>; // key = `${row}-${col}`
}

/** 게임 상태 */
export type GridPhase = "lobby" | "playing" | "result";

/** 한 판 결과 */
export interface GridResult {
  totalCells: number;
  correctCells: number;
  cells: GridCell[];
}

/** 게임 상수 */
export const GRID_SIZE = 3;
export const GRID_TOTAL_CELLS = GRID_SIZE * GRID_SIZE;
export const GRID_MAX_GUESSES = 9; // 격자 크기와 동일 — 한 칸에 한 번만 답할 수 있다
