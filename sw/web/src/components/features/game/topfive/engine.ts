/**
 * 상위 다섯 (Top Five) — 게임 엔진
 *
 * 핵심 책임:
 * 1. 날짜 시드로 결정론적 퍼즐 선택
 * 2. 후보 셔플
 * 3. 채점 (순위 정확 20점, 항목만 맞음 10점, 오답 0점)
 */

import {
  SCORE_EXACT_POSITION,
  SCORE_IN_TOP5,
  SLOTS_COUNT,
  type SlotPlacement,
  type SlotResult,
  type TopFivePuzzle,
  type TopFiveResult,
} from "./types";

// ─── 결정론적 난수 (날짜 시드) ───────────────────────────────

function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** YYYY-MM-DD → 정수 시드 */
export function dateToSeed(dateKey: string): number {
  let hash = 0;
  for (let i = 0; i < dateKey.length; i++) {
    hash = (hash * 31 + dateKey.charCodeAt(i)) | 0;
  }
  return hash;
}

/** 결정론적 셔플 (Fisher-Yates) */
export function seededShuffle<T>(items: readonly T[], random: () => number): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// ─── 오늘의 날짜 키 ──────────────────────────────────────────

export { getKSTDateKey as getTodayDateKey } from "@/lib/game/date-seed";

// ─── 퍼즐 풀 ────────────────────────────────────────────────

/** 서버에서 넘겨줄 퍼즐 풀 (여러 카테고리 중 날짜로 하나 선택) */
export interface TopFivePool {
  puzzles: TopFivePuzzle[];
}

/**
 * 풀에서 오늘의 퍼즐을 뽑는다.
 *
 * 알고리즘: **순환 인덱스 + 사이클 경계 회피**
 *
 * 날짜를 epoch day로 변환 → 풀 크기 N으로 나눈 나머지가 사이클 내 위치.
 * 각 사이클은 고유 순열을 가지며, 인접 사이클 경계에서 같은 퍼즐이 7일 내에
 * 다시 나오지 않도록 마지막/처음 7개를 교환한다.
 *
 * 결과:
 * - N >= 14: 7일 내 재등장 수학적 0% (N-7 >= 7이므로 경계 회피 항상 성공)
 * - N = 8~13: 대부분 0%에 가까움 (경계 회피가 부분 성공)
 * - N < 8: modulo 폴백 (7일 내 재등장 불가피하나 균등 분포 보장)
 *
 * 같은 날짜 = 같은 퍼즐 (결정례 유지).
 */
export function buildPuzzleForToday(pool: TopFivePool, dateKey: string): TopFivePuzzle | null {
  const n = pool.puzzles.length;
  if (n === 0) return null;

  const puzzleIndex = getPuzzleIndexForDate(n, dateKey);
  const basePuzzle = pool.puzzles[puzzleIndex];

  // 후보를 날짜 시드로 셔플 (퍼즐 선택과 독립)
  const dateSeed = dateToSeed(dateKey);
  const dateRandom = mulberry32(dateSeed);
  // 첫 난수를 소비해 옛 코드와의 충돌 방지
  dateRandom();
  const shuffledCandidates = seededShuffle(basePuzzle.candidates, dateRandom);

  return {
    ...basePuzzle,
    dateKey,
    candidates: shuffledCandidates,
  };
}

// ─── 순환 인덱스 + 경계 회피 ─────────────────────────────────

/** epoch 기준일: 2026-01-01 */
const EPOCH_BASE = Date.UTC(2026, 0, 1);

/** dateKey → epoch day (2026-01-01 = 0) */
function dateKeyToEpochDay(dateKey: string): number {
  const [y, m, d] = dateKey.split("-").map(Number);
  const epoch = Date.UTC(y, m - 1, d);
  return Math.round((epoch - EPOCH_BASE) / 86400000);
}

/** 날짜에 대응하는 퍼즐 인덱스를 결정론적으로 반환한다. */
function getPuzzleIndexForDate(n: number, dateKey: string): number {
  if (n === 1) return 0;

  const dayIndex = dateKeyToEpochDay(dateKey);
  const absDayIndex = dayIndex >= 0 ? dayIndex : dayIndex + Math.ceil(-dayIndex / n) * n;
  const cycleNum = Math.floor(absDayIndex / n);
  const cyclePos = absDayIndex % n;

  const perm = getCyclePerm(n, cycleNum);
  return perm[cyclePos];
}

/**
 * 사이클 번호에 대한 순열을 생성한다.
 *
 * 경계 회피: 이전 사이클의 마지막 WINDOW개가 이 사이클의 첫 WINDOW개에 나오지 않게
 * 교환한다. WINDOW = min(7, n-1). n >= 14이면 항상 성공, n < 14이면 최선 시도.
 */
function getCyclePerm(n: number, cycleNum: number): number[] {
  const WINDOW = Math.min(7, n - 1);

  // 이 사이클의 기본 순열
  const seed = dateToSeed(`topfive-cycle-${n}-${cycleNum}`);
  const random = mulberry32(seed);
  const perm = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [perm[i], perm[j]] = [perm[j], perm[i]];
  }

  // 첫 사이클은 경계 회피 불필요
  if (cycleNum <= 0) return perm;

  // 이전 사이클의 마지막 WINDOW개
  const prevPerm = getCyclePerm(n, cycleNum - 1);
  const forbidden = new Set(prevPerm.slice(n - WINDOW));

  // 첫 WINDOW 위치에서 금지된 값을 후방과 교환
  for (let i = 0; i < WINDOW; i++) {
    if (forbidden.has(perm[i])) {
      for (let j = WINDOW; j < n; j++) {
        if (!forbidden.has(perm[j])) {
          [perm[i], perm[j]] = [perm[j], perm[i]];
          break;
        }
      }
    }
  }

  return perm;
}

// ─── 채점 ────────────────────────────────────────────────────

/**
 * 유저가 5개 슬롯에 배치한 결과를 채점한다.
 *
 * 배점:
 * - 상위 5에 포함 + 정확한 순위 → 20점
 * - 상위 5에 포함 + 순위 틀림 → 10점
 * - 상위 5에 미포함 → 0점
 *
 * 최대: 100점 (5 × 20)
 */
export function evaluate(
  placements: SlotPlacement[],
  puzzle: TopFivePuzzle
): TopFiveResult {
  if (placements.length !== SLOTS_COUNT) {
    throw new Error(`Expected ${SLOTS_COUNT} placements, got ${placements.length}`);
  }

  const candidateMap = new Map(
    puzzle.candidates.map((c) => [c.id, c])
  );

  let correctItems = 0;
  let exactPositions = 0;
  let score = 0;
  const slotResults: SlotResult[] = [];

  for (const placement of placements) {
    const candidate = candidateMap.get(placement.candidateId);
    if (!candidate) {
      slotResults.push({
        slotIndex: placement.slotIndex,
        candidateId: placement.candidateId,
        candidateLabel: "?",
        isInTop5: false,
        isExactPosition: false,
        actualRank: null,
      });
      continue;
    }

    const isInTop5 = candidate.isAnswer;
    // 슬롯 인덱스 0 = 1위, 슬롯 인덱스 4 = 5위
    const expectedRank = placement.slotIndex + 1;
    const isExact = isInTop5 && candidate.rank === expectedRank;

    if (isInTop5) {
      correctItems++;
      if (isExact) {
        exactPositions++;
        score += SCORE_EXACT_POSITION;
      } else {
        score += SCORE_IN_TOP5;
      }
    }

    slotResults.push({
      slotIndex: placement.slotIndex,
      candidateId: placement.candidateId,
      candidateLabel: candidate.label,
      isInTop5,
      isExactPosition: isExact,
      actualRank: isInTop5 ? candidate.rank : null,
    });
  }

  // 정답 순서 (1~5위)
  const correctOrder = puzzle.candidates
    .filter((c) => c.isAnswer)
    .sort((a, b) => a.rank - b.rank);

  return {
    correctItems,
    exactPositions,
    score,
    slotResults,
    correctOrder,
  };
}

// ─── 유효성 검증 ─────────────────────────────────────────────

/** 퍼즐이 유효한지 사전 검증 */
export function validatePuzzle(puzzle: TopFivePuzzle): string[] {
  const errors: string[] = [];

  const answers = puzzle.candidates.filter((c) => c.isAnswer);
  if (answers.length !== SLOTS_COUNT) {
    errors.push(`Expected ${SLOTS_COUNT} answers, got ${answers.length}`);
  }

  // 태그 퍼즐은 후보가 5~12명일 수 있다 (최소 SLOTS_COUNT명 = 정답 5명)
  if (puzzle.candidates.length < SLOTS_COUNT) {
    errors.push(`Expected at least ${SLOTS_COUNT} candidates, got ${puzzle.candidates.length}`);
  }

  // 정답 순위 1~5 확인
  const ranks = answers.map((a) => a.rank).sort((a, b) => a - b);
  const expectedRanks = [1, 2, 3, 4, 5];
  if (JSON.stringify(ranks) !== JSON.stringify(expectedRanks)) {
    errors.push(`Answer ranks should be [1,2,3,4,5], got [${ranks}]`);
  }

  // 중복 ID 확인
  const ids = puzzle.candidates.map((c) => c.id);
  const uniqueIds = new Set(ids);
  if (uniqueIds.size !== ids.length) {
    errors.push("Duplicate candidate IDs detected");
  }

  return errors;
}
