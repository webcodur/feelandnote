/**
 * 어느 쪽 게임 엔진
 *
 * 책임:
 * 1. 후보 풀에서 유효한 쌍을 뽑는다 (최소 격차 보장, 중복 방지)
 * 2. 선택을 채점한다
 */

import type { MorelessCeleb, MorelessPair } from './types';
import { MIN_SCORE_GAP, REAPPEAR_COOLDOWN } from './types';

/**
 * 후보 풀에서 유효한 쌍을 하나 뽑는다.
 *
 * 규칙:
 * - 두 인물의 total_score 차이가 MIN_SCORE_GAP 이상이어야 한다.
 * - recentIds에 있는 인물은 제외한다 (재등장 방지).
 * - 최대 50회 시도 후 실패하면 null (풀이 너무 작을 때).
 */
export function pickPair(
  celebs: MorelessCeleb[],
  recentIds: Set<string>
): MorelessPair | null {
  // 사용 가능한 후보만 필터
  const available = celebs.filter((c) => !recentIds.has(c.id));

  if (available.length < 2) {
    // 쿨다운 무시하고라도 뽑아본다
    const fallback = celebs.length >= 2 ? celebs : null;
    if (!fallback) return null;
    return pickFromPool(fallback);
  }

  return pickFromPool(available);
}

function pickFromPool(pool: MorelessCeleb[]): MorelessPair | null {
  const maxAttempts = 50;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const i = randomIndex(pool.length);
    let j = randomIndex(pool.length - 1);
    if (j >= i) j += 1; // i와 겹치지 않게

    const a = pool[i];
    const b = pool[j];

    if (Math.abs(a.total_score - b.total_score) >= MIN_SCORE_GAP) {
      return { left: a, right: b };
    }
  }

  // 시도 초과 — 전수 탐색으로 한 쌍이라도 찾는다
  for (let i = 0; i < pool.length; i++) {
    for (let j = i + 1; j < pool.length; j++) {
      if (Math.abs(pool[i].total_score - pool[j].total_score) >= MIN_SCORE_GAP) {
        return Math.random() < 0.5
          ? { left: pool[i], right: pool[j] }
          : { left: pool[j], right: pool[i] };
      }
    }
  }

  return null;
}

/**
 * 유저의 선택을 채점한다.
 * @returns true = 정답 (큰 쪽을 골랐다)
 */
export function judgeChoice(
  pair: MorelessPair,
  chosen: 'left' | 'right'
): boolean {
  const chosenCeleb = chosen === 'left' ? pair.left : pair.right;
  const otherCeleb = chosen === 'left' ? pair.right : pair.left;
  return chosenCeleb.total_score > otherCeleb.total_score;
}

/**
 * 재등장 방지용 최근 ID 세트를 갱신한다.
 * REAPPEAR_COOLDOWN 라운드 분량만 유지.
 */
export function updateRecentIds(
  history: string[][],
  pair: MorelessPair
): string[][] {
  const newEntry = [pair.left.id, pair.right.id];
  const updated = [...history, newEntry];
  // 쿨다운 초과분 제거
  if (updated.length > REAPPEAR_COOLDOWN) {
    return updated.slice(updated.length - REAPPEAR_COOLDOWN);
  }
  return updated;
}

/** history를 flat Set으로 변환 */
export function historyToRecentIds(history: string[][]): Set<string> {
  return new Set(history.flat());
}

// ─── 유틸 ───

function randomIndex(length: number): number {
  return Math.floor(Math.random() * length);
}
