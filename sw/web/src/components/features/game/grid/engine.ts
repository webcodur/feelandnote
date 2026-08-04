/**
 * 교차 격자 (Crossing Grid) 규칙 엔진
 *
 * 핵심 책임:
 * 1. 조건 목록에서 행 3·열 3을 골라 퍼즐을 만든다.
 * 2. 각 칸(행×열 교차)에 정답이 최소 1명 있음을 보장한다.
 * 3. 인물이 조건을 만족하는지 판정한다.
 */

import {
  GRID_SIZE,
  type ConditionAxis,
  type GridCeleb,
  type GridCondition,
  type GridPuzzle,
} from "./types";

// ──────────────────── 세기 판정 ────────────────────

/** birth_date 텍스트 → 세기 문자열 ("BC5", "15", "20" 등) */
export function getCentury(birthDate: string | null): string | null {
  if (!birthDate) return null;
  const num = parseInt(birthDate, 10);
  if (!Number.isFinite(num)) return null;
  if (num < 0) {
    // BC: -500 → BC6세기, -384 → BC4세기
    return `BC${Math.ceil(Math.abs(num) / 100)}`;
  }
  return String(Math.ceil(num / 100));
}

// ──────────────────── 조건 판정 ────────────────────

/** 인물이 특정 조건을 만족하는지 */
export function matchesCondition(celeb: GridCeleb, condition: GridCondition): boolean {
  switch (condition.axis) {
    case "nationality":
      return celeb.nationality === condition.value;
    case "profession":
      return celeb.profession === condition.value;
    case "century":
      return getCentury(celeb.birthDate) === condition.value;
    case "tag":
      return celeb.tagIds.includes(condition.value);
    default:
      return false;
  }
}

/** 인물이 행 조건과 열 조건을 동시에 만족하는지 */
export function matchesCell(
  celeb: GridCeleb,
  rowCondition: GridCondition,
  colCondition: GridCondition,
): boolean {
  return matchesCondition(celeb, rowCondition) && matchesCondition(celeb, colCondition);
}

// ──────────────────── 퍼즐 생성 ────────────────────

/** Fisher-Yates 셔플 */
export function shuffle<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * 사용 가능한 조건 후보를 추출한다.
 * 각 축에서 인물이 2명 이상 존재하는 값만 조건으로 인정.
 */
export function extractConditions(celebs: readonly GridCeleb[]): GridCondition[] {
  const conditions: GridCondition[] = [];

  // nationality
  const natMap = new Map<string, number>();
  for (const c of celebs) {
    if (c.nationality) natMap.set(c.nationality, (natMap.get(c.nationality) ?? 0) + 1);
  }
  for (const [code, count] of natMap) {
    if (count >= 2) {
      conditions.push({
        axis: "nationality",
        value: code,
        label: code,
        labelEn: code,
      });
    }
  }

  // profession
  const profMap = new Map<string, number>();
  for (const c of celebs) {
    if (c.profession) profMap.set(c.profession, (profMap.get(c.profession) ?? 0) + 1);
  }
  for (const [prof, count] of profMap) {
    if (count >= 2) {
      conditions.push({
        axis: "profession",
        value: prof,
        label: prof,
        labelEn: prof,
      });
    }
  }

  // century
  const centuryMap = new Map<string, number>();
  for (const c of celebs) {
    const cen = getCentury(c.birthDate);
    if (cen) centuryMap.set(cen, (centuryMap.get(cen) ?? 0) + 1);
  }
  for (const [cen, count] of centuryMap) {
    if (count >= 2) {
      conditions.push({
        axis: "century",
        value: cen,
        label: cen,
        labelEn: cen,
      });
    }
  }

  // tag
  const tagMap = new Map<string, number>();
  for (const c of celebs) {
    for (const tagId of c.tagIds) {
      tagMap.set(tagId, (tagMap.get(tagId) ?? 0) + 1);
    }
  }
  for (const [tagId, count] of tagMap) {
    if (count >= 2) {
      conditions.push({
        axis: "tag",
        value: tagId,
        label: tagId,
        labelEn: tagId,
      });
    }
  }

  return conditions;
}

/**
 * 퍼즐 생성. 그리디 구축으로 모든 칸에 정답이 있는 조합을 보장한다.
 *
 * 전략:
 * 1. 두 축(rowAxis, colAxis)을 고른다.
 * 2. rowAxis의 조건 하나를 시드로 놓는다.
 * 3. colAxis에서 시드 행과 교차가 모두 유효한 조건 3개를 뽑는다.
 * 4. rowAxis에서 뽑힌 col 조건들과 교차가 모두 유효한 조건 3개를 뽑는다.
 * 5. 9칸 전체 정답 존재를 최종 확인한다.
 *
 * 난이도 보정: 각 칸에 정답이 MIN_CELL_ANSWERS명 이상이어야 퍼즐을 채택한다.
 * 1명뿐인 칸은 "그 한 명을 모르면 풀 수 없는 막힌 목"이 되므로 최소 2명을 요구하되,
 * 완화 전략(fallback)으로 최소 1명까지 내려간다. 이 두 단계 시도로 생성 실패율을 유지한다.
 *
 * 최대 MAX_ATTEMPTS번 시도 후 실패하면 null.
 */
const MAX_ATTEMPTS = 300;
/** 허용 가능한 1명 칸 최대 수 (이하면 즉시 채택) */
const MAX_SINGLE_ANSWER_CELLS = 4;

export function generatePuzzle(
  celebs: readonly GridCeleb[],
  conditions: readonly GridCondition[],
  random: () => number = Math.random,
): GridPuzzle | null {
  // 축별로 조건을 분류
  const byAxis: Record<ConditionAxis, GridCondition[]> = {
    nationality: [],
    profession: [],
    century: [],
    tag: [],
  };
  for (const cond of conditions) {
    byAxis[cond.axis].push(cond);
  }

  // 유효 축 (조건 3개 이상)
  const validAxes = (Object.keys(byAxis) as ConditionAxis[]).filter(
    (axis) => byAxis[axis].length >= GRID_SIZE,
  );
  if (validAxes.length < 2) return null;

  // 교차 매칭 캐시: condA.value + "|" + condB.value → 매칭 인물 id[]
  const crossCache = new Map<string, string[]>();
  function getCross(a: GridCondition, b: GridCondition): string[] {
    const key = `${a.axis}:${a.value}|${b.axis}:${b.value}`;
    if (crossCache.has(key)) return crossCache.get(key)!;
    const ids = celebs
      .filter((c) => matchesCondition(c, a) && matchesCondition(c, b))
      .map((c) => c.id);
    crossCache.set(key, ids);
    return ids;
  }

  let bestPuzzle: GridPuzzle | null = null;
  let bestSingleCells = Infinity;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    // 두 축 랜덤 선택
    const axisIdxA = Math.floor(random() * validAxes.length);
    let axisIdxB = Math.floor(random() * (validAxes.length - 1));
    if (axisIdxB >= axisIdxA) axisIdxB++;
    const rowAxis = validAxes[axisIdxA];
    const colAxis = validAxes[axisIdxB];

    const rowPool = shuffle(byAxis[rowAxis], random);
    const colPool = shuffle(byAxis[colAxis], random);

    const selectedRows: GridCondition[] = [];
    const selectedCols: GridCondition[] = [];

    // 열 3개를 고른다 (행 시드에 대해 유효한 열)
    const rowSeed = rowPool[0];
    for (const cc of colPool) {
      if (selectedCols.length >= GRID_SIZE) break;
      if (getCross(rowSeed, cc).length > 0) {
        selectedCols.push(cc);
      }
    }
    if (selectedCols.length < GRID_SIZE) continue;

    // 행 3개를 고른다 (모든 선택된 열과 교차가 유효한 것)
    for (const rc of rowPool) {
      if (selectedRows.length >= GRID_SIZE) break;
      const allValid = selectedCols.every((cc) => getCross(rc, cc).length > 0);
      if (allValid) {
        selectedRows.push(rc);
      }
    }
    if (selectedRows.length < GRID_SIZE) continue;

    // 최종 검증 + answers 구축 + 품질 측정
    const answers: Record<string, string[]> = {};
    let allValid = true;
    let singleCells = 0;
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        const ids = getCross(selectedRows[row], selectedCols[col]);
        if (ids.length === 0) {
          allValid = false;
          break;
        }
        answers[`${row}-${col}`] = ids;
        if (ids.length === 1) singleCells++;
      }
      if (!allValid) break;
    }

    if (!allValid) continue;

    const puzzle: GridPuzzle = {
      rowConditions: selectedRows as [GridCondition, GridCondition, GridCondition],
      colConditions: selectedCols as [GridCondition, GridCondition, GridCondition],
      answers,
    };

    // 이상적 기준: 1명 칸이 허용 최대 이하 → 즉시 반환
    if (singleCells <= MAX_SINGLE_ANSWER_CELLS) return puzzle;

    // 그렇지 않으면 최선 후보로 보관
    if (singleCells < bestSingleCells) {
      bestSingleCells = singleCells;
      bestPuzzle = puzzle;
    }
  }

  return bestPuzzle;
}

/**
 * 검증: 유저가 입력한 인물이 해당 칸의 정답인지
 */
export function validateAnswer(
  puzzle: GridPuzzle,
  row: number,
  col: number,
  celebId: string,
  usedIds: Set<string>,
): boolean {
  if (usedIds.has(celebId)) return false;
  const key = `${row}-${col}`;
  const valid = puzzle.answers[key];
  if (!valid) return false;
  return valid.includes(celebId);
}
