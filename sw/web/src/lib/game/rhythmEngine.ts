/*
  파일명: lib/game/rhythmEngine.ts
  기능: 전투(assault) 접전용 낙하노트 리듬 엔진
  책임: 노트 생성, 입력 판정, 스코어 계산, AI 시뮬레이션
*/

import type { BattleCard } from "./types";

// ─── 타입 ───

export type RhythmJudgment = "perfect" | "good" | "miss";

export type Lane = 0 | 1 | 2;

export interface RhythmNote {
  id: number;
  targetTime: number; // ms (게임 시작 기준)
  lane: Lane;
}

export interface RhythmResult {
  judgments: RhythmJudgment[];
  score: number;
}

// ─── 상수 ───

export const NOTE_COUNT = 12;        // 기본 노트 개수
const NOTE_INTERVAL = 700;    // 노트 간격 (ms)
const FIRST_NOTE_DELAY = 1200; // 첫 노트까지 대기 (ms)
const PERFECT_WINDOW = 50;   // ±ms
const GOOD_WINDOW = 120;     // ±ms
export const NOTE_FALL_DURATION = 1200; // 낙하 시간 (ms)

const JUDGMENT_SCORES: Record<RhythmJudgment, number> = {
  perfect: 100,
  good: 60,
  miss: 0,
};

// ─── 노트 생성 ───

export function generateNotes(count = 5): RhythmNote[] {
  const notes: RhythmNote[] = [];
  let consecutiveCount = 0;
  let prevLane: Lane = -1 as Lane;

  for (let i = 0; i < count; i++) {
    let lane: Lane;

    // 같은 레인 최대 2연속까지만 허용
    if (consecutiveCount >= 2) {
      const candidates = ([0, 1, 2] as Lane[]).filter(l => l !== prevLane);
      lane = candidates[Math.floor(Math.random() * candidates.length)];
    } else {
      lane = Math.floor(Math.random() * 3) as Lane;
    }

    consecutiveCount = lane === prevLane ? consecutiveCount + 1 : 1;
    prevLane = lane;

    notes.push({
      id: i,
      targetTime: FIRST_NOTE_DELAY + i * NOTE_INTERVAL,
      lane,
    });
  }

  return notes;
}

// ─── 판정 ───

export function judgeInput(
  inputTime: number,
  targetTime: number,
  inputLane?: Lane,
  noteLane?: Lane,
): RhythmJudgment {
  // 레인 불일치 시 무조건 miss
  if (inputLane !== undefined && noteLane !== undefined && inputLane !== noteLane) {
    return "miss";
  }
  const diff = Math.abs(inputTime - targetTime);
  if (diff <= PERFECT_WINDOW) return "perfect";
  if (diff <= GOOD_WINDOW) return "good";
  return "miss";
}

// ─── 스코어 ───

export function calcRhythmScore(judgments: RhythmJudgment[]): number {
  if (judgments.length === 0) return 0;
  const total = judgments.reduce((sum, j) => sum + JUDGMENT_SCORES[j], 0);
  return Math.round(total / judgments.length);
}

// ─── AI 시뮬레이션 ───

/** martial 기반 확률적 판정 시뮬. 높을수록 perfect 비율 ↑ */
export function simulateAiRhythm(card: BattleCard, noteCount = 5): RhythmResult {
  const martial = card.ability.martial;

  // martial → perfect/good/miss 확률
  const perfectRate = Math.min(0.8, 0.1 + martial * 0.007);
  const goodRate = Math.min(0.5, 0.3 + martial * 0.002);
  // miss = 1 - perfect - good

  const judgments: RhythmJudgment[] = [];
  for (let i = 0; i < noteCount; i++) {
    const r = Math.random();
    if (r < perfectRate) judgments.push("perfect");
    else if (r < perfectRate + goodRate) judgments.push("good");
    else judgments.push("miss");
  }

  return { judgments, score: calcRhythmScore(judgments) };
}
