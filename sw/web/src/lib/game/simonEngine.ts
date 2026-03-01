/*
  파일명: lib/game/simonEngine.ts
  기능: 내정(govern) 접전용 사이먼 게임 엔진
  책임: 패턴 생성, 입력 검증, AI 시뮬레이션
*/

import type { BattleCard } from "./types";

// ─── 상수 ───

export const GRID_SIZE = 6;         // 2×3 그리드
export const MAX_ROUNDS = 5;
export const SHOW_INTERVAL = 600;   // 점등 간격 (ms)
export const SHOW_DURATION = 400;   // 단일 점등 시간 (ms)

export const CELL_COLORS = [
  "#e74c3c", // 빨강
  "#3498db", // 파랑
  "#2ecc71", // 초록
  "#f1c40f", // 노랑
  "#9b59b6", // 보라
  "#e67e22", // 주황
] as const;

// ─── 패턴 생성 ───

/** 라운드별 패턴 길이: 1→3, 2→4, 3→5 */
export function getPatternLength(round: number): number {
  return round + 2;
}

/** gridSize 칸 중 length개를 순서대로 뽑는다 */
export function generatePattern(length: number, gridSize = GRID_SIZE): number[] {
  const pattern: number[] = [];
  for (let i = 0; i < length; i++) {
    pattern.push(Math.floor(Math.random() * gridSize));
  }
  return pattern;
}

// ─── 입력 검증 ───

/** 중간 검증: 현재까지의 입력이 패턴과 일치하는지 */
export function isInputCorrectSoFar(input: number[], pattern: number[]): boolean {
  for (let i = 0; i < input.length; i++) {
    if (input[i] !== pattern[i]) return false;
  }
  return true;
}

/** 완료 검증: 입력이 패턴과 완전히 일치하는지 */
export function isPatternComplete(input: number[], pattern: number[]): boolean {
  return input.length === pattern.length && isInputCorrectSoFar(input, pattern);
}

// ─── AI 시뮬레이션 ───

/** command 능력치 기반 성공/실패. 라운드↑ 마다 성공률 감소 */
export function simulateAiSimon(card: BattleCard, round: number): boolean {
  const command = card.ability.command;

  // 기본 성공률: command 50 → 70%, 100 → 95%
  const baseRate = Math.min(0.95, 0.45 + command * 0.005);
  // 라운드 페널티: 라운드마다 -8%
  const rate = Math.max(0.1, baseRate - (round - 1) * 0.08);

  return Math.random() < rate;
}
