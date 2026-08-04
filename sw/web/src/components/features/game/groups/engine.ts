/**
 * 넷씩 넷 (Groups) — 게임 엔진
 *
 * 퍼즐 생성 · 추측 판정 · 날짜 시드 결정론적 셔플.
 * DB 의존 없음 — 이미 정제된 데이터를 받아서 작동한다.
 */

import {
  GROUP_SIZE,
  MAX_MISTAKES,
  TOTAL_ITEMS,
  type GroupDef,
  type GroupItem,
  type GroupsPuzzle,
  type GuessResult,
  type SolvedGroup,
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

// ─── 퍼즐 조립 ──────────────────────────────────────────────

export interface PuzzlePool {
  groups: GroupDef[];
  /** 각 groupDef에 대응하는 인물 목록 (groupDef[i] → members[i]) */
  members: GroupItem[][];
}

/**
 * 풀에서 오늘의 퍼즐을 뽑는다.
 * - 4묶음 선정은 날짜 시드로 결정론적
 * - 같은 난이도 순서(0,1,2,3)로 배정
 * - 인물 16명은 셔플하여 보드에 배치
 */
export function buildPuzzleFromPool(pool: PuzzlePool, dateKey: string): GroupsPuzzle | null {
  if (pool.groups.length < 4) return null;

  const seed = dateToSeed(dateKey);
  const random = mulberry32(seed);

  // 난이도별로 묶음을 분류
  const byDifficulty: Map<number, number[]> = new Map();
  pool.groups.forEach((g, i) => {
    const arr = byDifficulty.get(g.difficulty) ?? [];
    arr.push(i);
    byDifficulty.set(g.difficulty, arr);
  });

  // 각 난이도에서 하나씩 선택 (없으면 아무거나)
  const selectedIndices: number[] = [];
  const usedItemIds = new Set<string>();

  for (let diff = 0; diff < 4; diff++) {
    const candidates = (byDifficulty.get(diff) ?? []).filter((idx) => {
      // 이미 선택된 묶음의 인물과 겹치면 제외
      return pool.members[idx].every((m) => !usedItemIds.has(m.id));
    });

    if (candidates.length === 0) {
      // 대안: 아직 선택 안 된 아무 묶음
      const fallback = pool.groups
        .map((_, i) => i)
        .filter(
          (i) =>
            !selectedIndices.includes(i) &&
            pool.members[i].every((m) => !usedItemIds.has(m.id))
        );
      if (fallback.length === 0) return null;
      const pick = fallback[Math.floor(random() * fallback.length)];
      selectedIndices.push(pick);
      pool.members[pick].forEach((m) => usedItemIds.add(m.id));
    } else {
      const pick = candidates[Math.floor(random() * candidates.length)];
      selectedIndices.push(pick);
      pool.members[pick].forEach((m) => usedItemIds.add(m.id));
    }
  }

  if (selectedIndices.length !== 4) return null;

  // 인물에 groupIndex 부여
  const allItems: GroupItem[] = [];
  const groups = selectedIndices.map((poolIdx, groupIdx) => {
    const def = pool.groups[poolIdx];
    pool.members[poolIdx].forEach((m) => {
      allItems.push({ ...m, groupIndex: groupIdx });
    });
    return { ...def, difficulty: groupIdx };
  }) as [GroupDef, GroupDef, GroupDef, GroupDef];

  // 보드 셔플
  const shuffledItems = seededShuffle(allItems, random);

  return { dateKey, groups, items: shuffledItems };
}

// ─── 추측 판정 ──────────────────────────────────────────────

/**
 * 4명을 선택했을 때 정답인지 확인한다.
 * @returns GuessResult
 */
export function evaluateGuess(
  selectedIds: string[],
  items: GroupItem[],
  solvedGroups: SolvedGroup[]
): GuessResult {
  if (selectedIds.length !== GROUP_SIZE) {
    return { selectedIds, correct: false, matchCount: 0 };
  }

  const selectedItems = selectedIds
    .map((id) => items.find((it) => it.id === id))
    .filter(Boolean) as GroupItem[];

  if (selectedItems.length !== GROUP_SIZE) {
    return { selectedIds, correct: false, matchCount: 0 };
  }

  // 이미 풀린 묶음 제외한 미풀린 묶음 인덱스
  const solvedGroupIndices = new Set(solvedGroups.map((s) => s.groupIndex));

  // 각 묶음에 몇 명이나 매칭되는지 계산
  let bestMatch = 0;
  let bestGroupIndex = -1;

  for (let gi = 0; gi < 4; gi++) {
    if (solvedGroupIndices.has(gi)) continue;
    const count = selectedItems.filter((it) => it.groupIndex === gi).length;
    if (count > bestMatch) {
      bestMatch = count;
      bestGroupIndex = gi;
    }
  }

  if (bestMatch === GROUP_SIZE) {
    return {
      selectedIds,
      correct: true,
      matchCount: GROUP_SIZE,
      groupIndex: bestGroupIndex,
    };
  }

  return {
    selectedIds,
    correct: false,
    matchCount: bestMatch,
  };
}

// ─── 유효성 검증 ─────────────────────────────────────────────

/** 퍼즐이 유효한지 사전 검증 (인원수, 중복, 묶음 크기) */
export function validatePuzzle(puzzle: GroupsPuzzle): string[] {
  const errors: string[] = [];

  if (puzzle.items.length !== TOTAL_ITEMS) {
    errors.push(`Expected ${TOTAL_ITEMS} items, got ${puzzle.items.length}`);
  }

  if (puzzle.groups.length !== 4) {
    errors.push(`Expected 4 groups, got ${puzzle.groups.length}`);
  }

  // 각 묶음 인원수 확인
  for (let gi = 0; gi < 4; gi++) {
    const members = puzzle.items.filter((it) => it.groupIndex === gi);
    if (members.length !== GROUP_SIZE) {
      errors.push(`Group ${gi} has ${members.length} members, expected ${GROUP_SIZE}`);
    }
  }

  // 중복 ID 확인
  const ids = puzzle.items.map((it) => it.id);
  const uniqueIds = new Set(ids);
  if (uniqueIds.size !== ids.length) {
    errors.push(`Duplicate item IDs detected`);
  }

  return errors;
}

// ─── 게임 완료 판정 ──────────────────────────────────────────

export function isGameOver(
  solvedGroups: SolvedGroup[],
  mistakes: number
): { over: boolean; won: boolean } {
  if (mistakes >= MAX_MISTAKES) return { over: true, won: false };
  if (solvedGroups.length >= 4) return { over: true, won: true };
  return { over: false, won: false };
}
