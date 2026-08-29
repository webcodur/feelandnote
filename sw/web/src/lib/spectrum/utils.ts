import {
  ABILITY_KEYS,
  STAT_KEYS,
  TENDENCY_KEYS,
  VIRTUE_KEYS,
  type AbilityKey,
  type StatKey,
  type VirtueKey,
} from './constants'
import type { SpectrumProfile, SpectrumStats } from './types'

/** @deprecated SpectrumProfile를 직접 사용하세요 */
export type SpectrumVector = SpectrumProfile

export interface SimilarCeleb extends SpectrumProfile {
  distance: number
}

export type SpectrumMatchCategory = 'overall' | 'disposition' | 'virtue' | 'ability' | 'opposite'

export interface SpectrumMatchEvidence {
  axis: keyof SpectrumStats
  targetValue: number
  candidateValue: number
  /** 능력·덕목 근거의 방향 — 집단 평균 대비 함께 높은가(high) 함께 낮은가(low). 성향 축은 방향 라벨 자체가 방향이라 비워 둔다 */
  direction?: 'high' | 'low'
}

/** 인물 지문 한 항목 — 집단에서 크게 벗어난 축과 그 위치 */
export interface SpectrumHighlight {
  axis: keyof SpectrumStats
  /** 벗어난 방향의 극단 기준 상위 비율(%). 1이면 상위 1% */
  percentile: number
  direction: 'high' | 'low'
  value: number
}

export interface SpectrumMatch {
  celeb_id: string
  nickname: string
  avatar_url: string | null
  distance: number
  matchPercent: number
  evidence: SpectrumMatchEvidence[]
  comparison: SpectrumMatchEvidence[]
}

export type SpectrumMatchGroups = Record<SpectrumMatchCategory, SpectrumMatch[]>

export type SpectrumMatchDistances = Record<SpectrumMatchCategory, number>

export interface VirtuePopulationStat {
  mean: number
  standardDeviation: number
}

export type VirtuePopulationStats = Record<VirtueKey, VirtuePopulationStat>
export type AbilityPopulationStats = Record<AbilityKey, VirtuePopulationStat>
export type EmphasizedVirtueVector = Record<VirtueKey, number>
export type EmphasizedAbilityVector = Record<AbilityKey, number>

/** 중시 덕목은 한 인물에게 가장 두드러진 덕목까지만 비교한다. */
export const EMPHASIZED_VIRTUE_LIMIT = 3

/** 능력 닮음은 이 인물에게 가장 높은 대표 강점 하나만 기준으로 삼는다. */
export const EMPHASIZED_ABILITY_LIMIT = 1

/** 모집단에서 주어진 축들의 평균과 표준편차를 구한다. */
export function calcPopulationStats<K extends keyof SpectrumStats>(
  spectra: readonly SpectrumStats[],
  keys: readonly K[],
): Record<K, VirtuePopulationStat> {
  const count = spectra.length
  const sums = Object.fromEntries(
    keys.map((axis) => [axis, 0]),
  ) as Record<K, number>

  for (const spectrum of spectra) {
    for (const axis of keys) sums[axis] += spectrum[axis]
  }

  const means = Object.fromEntries(
    keys.map((axis) => [axis, count > 0 ? sums[axis] / count : 0]),
  ) as Record<K, number>
  const squaredDifferences = Object.fromEntries(
    keys.map((axis) => [axis, 0]),
  ) as Record<K, number>

  for (const spectrum of spectra) {
    for (const axis of keys) {
      squaredDifferences[axis] += (spectrum[axis] - means[axis]) ** 2
    }
  }

  return Object.fromEntries(
    keys.map((axis) => [
      axis,
      {
        mean: means[axis],
        standardDeviation:
          count > 0 ? Math.sqrt(squaredDifferences[axis] / count) : 0,
      },
    ]),
  ) as Record<K, VirtuePopulationStat>
}

/** 활성 인물 모집단에서 각 덕목의 평균과 표준편차를 구한다. */
export function calcVirtuePopulationStats(
  spectra: readonly SpectrumStats[],
): VirtuePopulationStats {
  return calcPopulationStats(spectra, VIRTUE_KEYS)
}

/** 활성 인물 모집단에서 각 능력의 평균과 표준편차를 구한다. */
// ─── 집단 위치 보정 ───
//
// 능력·덕목 12축은 절대 점수의 쏠림이 축마다 심하다(실측: 근면 평균 81·표준편차 10,
// 통솔 평균 60·표준편차 23). 절대값 그대로 거리를 재면 퍼짐이 넓은 축이 순위를
// 지배하고, 전원이 높은 축은 아무것도 구별하지 못한다. 그래서 유사도 비교는
// 절대 점수가 아니라 "집단 안에서 어디쯤인가"(z점수)로 보정한 값 위에서 수행한다.
// 성향 4축(-50~+50)은 방향 자체가 절대 의미이고 축 간 퍼짐 차이가 작아 원값을 쓴다.

/** z점수 절단 한계. ±2.5σ 밖은 순위에 더 기여하지 않는다 */
const Z_CLAMP = 2.5

/** 능력·덕목 근거로 인정하는 최소 이탈(σ). 약 상·하위 20% 밖 */
const STAT_EVIDENCE_MIN_Z = 0.8

/** 인물 지문에 올리는 최소 이탈(σ) */
const HIGHLIGHT_MIN_Z = 1.0

export type StatPopulationStats = Record<StatKey, VirtuePopulationStat>

function axisZ(value: number, stat: VirtuePopulationStat): number {
  return stat.standardDeviation > 0
    ? (value - stat.mean) / stat.standardDeviation
    : 0
}

/** z점수를 0~100 보정 점수로 되돌린다. 성향 축과 같은 폭(100)이라 거리 공식을 공유한다 */
function zToScore(z: number): number {
  const clamped = Math.max(-Z_CLAMP, Math.min(Z_CLAMP, z))
  return ((clamped + Z_CLAMP) / (2 * Z_CLAMP)) * 100
}

/** 능력·덕목 12축만 집단 위치 보정 점수로 바꾼 벡터. 성향 4축은 원값 유지 */
export function toPopulationAdjustedStats(
  spectrum: SpectrumStats,
  statStats: StatPopulationStats,
): SpectrumStats {
  const adjusted = { ...spectrum }
  for (const axis of STAT_KEYS) {
    adjusted[axis] = zToScore(axisZ(spectrum[axis], statStats[axis]))
  }
  return adjusted
}

/**
 * 축별 점수 분포 차이를 보정한 뒤 평균보다 높은 덕목 중 상위 축만 남긴다.
 * 예: 모집단 전체가 높은 근면 점수가 다른 덕목보다 무조건 강점으로 잡히는 일을 막는다.
 */
export function getEmphasizedVirtueVector(
  spectrum: SpectrumStats,
  populationStats: VirtuePopulationStats,
  limit: number = EMPHASIZED_VIRTUE_LIMIT,
): EmphasizedVirtueVector {
  const strengths = VIRTUE_KEYS.map((axis) => {
    const { mean, standardDeviation } = populationStats[axis]
    return {
      axis,
      value:
        standardDeviation > 0
          ? Math.max(0, (spectrum[axis] - mean) / standardDeviation)
          : 0,
    }
  })
    .filter(({ value }) => value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, Math.max(0, limit))

  const vector = Object.fromEntries(
    VIRTUE_KEYS.map((axis) => [axis, 0]),
  ) as EmphasizedVirtueVector
  for (const strength of strengths) vector[strength.axis] = strength.value
  return vector
}

/**
 * 현재 인물의 능력치 중 실제 점수가 가장 높고 집단에서도 충분히 높은 축만 남긴다.
 * 낮은 능력치가 우연히 비슷하다는 이유로 닮은 인물로 보이는 일을 막는다.
 */
export function getEmphasizedAbilityVector(
  spectrum: SpectrumStats,
  populationStats: AbilityPopulationStats,
  limit: number = EMPHASIZED_ABILITY_LIMIT,
): EmphasizedAbilityVector {
  const strengths = ABILITY_KEYS.map((axis) => ({
    axis,
    score: spectrum[axis],
    value: axisZ(spectrum[axis], populationStats[axis]),
  }))
    .filter(({ value }) => value >= STAT_EVIDENCE_MIN_Z)
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.value - a.value ||
        a.axis.localeCompare(b.axis),
    )
    .slice(0, Math.max(0, limit))

  const vector = Object.fromEntries(
    ABILITY_KEYS.map((axis) => [axis, 0]),
  ) as EmphasizedAbilityVector
  for (const strength of strengths) vector[strength.axis] = strength.value
  return vector
}

/**
 * 두 인물에게 함께 두드러진 덕목만 비교하는 대칭형 가중 Jaccard 유사도.
 * 함께 낮은 덕목은 두 벡터에서 모두 0이므로 중시 덕목 일치도에 기여하지 않는다.
 */
export function calcEmphasizedVirtueSimilarity(
  target: EmphasizedVirtueVector,
  candidate: EmphasizedVirtueVector,
): number {
  let sharedStrength = 0
  let totalStrength = 0

  for (const axis of VIRTUE_KEYS) {
    sharedStrength += Math.min(target[axis], candidate[axis])
    totalStrength += Math.max(target[axis], candidate[axis])
  }

  return totalStrength > 0 ? sharedStrength / totalStrength : 0
}

/**
 * 현재 인물의 대표 강점 축에서만 두 인물의 높은 정도를 비교한다.
 * 비교 인물의 다른 강점은 벌점이 아니며, 같은 축이 평균 이하면 일치도는 0이다.
 */
export function calcEmphasizedAbilitySimilarity(
  target: EmphasizedAbilityVector,
  candidate: SpectrumStats,
  populationStats: AbilityPopulationStats,
): number {
  let sharedStrength = 0
  let totalStrength = 0

  for (const axis of ABILITY_KEYS) {
    if (target[axis] <= 0) continue

    const candidateStrength = Math.max(
      0,
      axisZ(candidate[axis], populationStats[axis]),
    )
    if (candidateStrength < STAT_EVIDENCE_MIN_Z) continue

    sharedStrength += Math.min(target[axis], candidateStrength)
    totalStrength += Math.max(target[axis], candidateStrength)
  }

  return totalStrength > 0 ? sharedStrength / totalStrength : 0
}

/** 카드와 상세 비교에 표시할 공통 중시 덕목. */
export function getEmphasizedVirtueEvidence(
  target: SpectrumStats,
  candidate: SpectrumStats,
  targetEmphasizedVirtues: EmphasizedVirtueVector,
  candidateEmphasizedVirtues: EmphasizedVirtueVector,
  limit: number,
): SpectrumMatchEvidence[] {
  return VIRTUE_KEYS
    .filter(
      (axis) =>
        targetEmphasizedVirtues[axis] > 0 &&
        candidateEmphasizedVirtues[axis] > 0,
    )
    .sort(
      (a, b) =>
        Math.min(
          targetEmphasizedVirtues[b],
          candidateEmphasizedVirtues[b],
        ) -
        Math.min(
          targetEmphasizedVirtues[a],
          candidateEmphasizedVirtues[a],
        ),
    )
    .slice(0, limit)
    .map((axis) => ({
      axis,
      targetValue: target[axis],
      candidateValue: candidate[axis],
    }))
}

/** 카드에 표시할 공통 대표 강점. 낮은 능력치는 근거로 만들지 않는다. */
export function getEmphasizedAbilityEvidence(
  target: SpectrumStats,
  candidate: SpectrumStats,
  targetEmphasizedAbilities: EmphasizedAbilityVector,
  populationStats: AbilityPopulationStats,
): SpectrumMatchEvidence[] {
  return ABILITY_KEYS
    .filter(
      (axis) =>
        targetEmphasizedAbilities[axis] > 0 &&
        axisZ(candidate[axis], populationStats[axis]) >= STAT_EVIDENCE_MIN_Z,
    )
    .sort(
      (a, b) =>
        Math.min(
          targetEmphasizedAbilities[b],
          axisZ(candidate[b], populationStats[b]),
        ) -
        Math.min(
          targetEmphasizedAbilities[a],
          axisZ(candidate[a], populationStats[a]),
        ),
    )
    .map((axis) => ({
      axis,
      targetValue: target[axis],
      candidateValue: candidate[axis],
      direction: 'high' as const,
    }))
}

/**
 * 후보 한 명의 5가지 비교 거리를 한 번의 지표 순회로 계산한다.
 * 반대 성향은 능력·덕목을 건드리지 않고 성향 4축의 부호만 뒤집어 비교한다.
 * 유사 인물 산정에는 능력·덕목을 `toPopulationAdjustedStats`로 보정한 벡터를 넣는다 —
 * 원값 벡터를 넣으면 퍼짐 넓은 축(통솔·무력)이 순위를 지배한다.
 */
export function calcSpectrumMatchDistances(
  target: SpectrumStats,
  candidate: SpectrumStats,
): SpectrumMatchDistances {
  let abilitySum = 0
  let virtueSum = 0
  let dispositionSum = 0
  let oppositeSum = 0

  for (const key of ABILITY_KEYS) {
    abilitySum += (target[key] - candidate[key]) ** 2
  }
  for (const key of VIRTUE_KEYS) {
    virtueSum += (target[key] - candidate[key]) ** 2
  }
  for (const key of TENDENCY_KEYS) {
    dispositionSum += (target[key] - candidate[key]) ** 2
    oppositeSum += (-target[key] - candidate[key]) ** 2
  }

  return {
    overall: Math.sqrt(abilitySum + virtueSum + dispositionSum),
    disposition: Math.sqrt(dispositionSum),
    virtue: Math.sqrt(virtueSum),
    ability: Math.sqrt(abilitySum),
    opposite: Math.sqrt(oppositeSum),
  }
}

/**
 * 상위 매칭 인물 카드에 보여 줄 대표 축을 고른다.
 * 근거의 자격 — 두 사람 모두 특징이 뚜렷하고 그 방향이 같은 축만 인정한다.
 * 능력·덕목은 집단 평균보다 함께 높은 축, 성향은
 * 치우침이 뚜렷하고 방향이 같은 축. 둘 다 어중간한 축은 점수 차가 작아도
 * 아무것도 말해주지 않으므로 근거로 올리지 않는다.
 */
export function getSpectrumMatchEvidence(
  target: SpectrumVector,
  candidate: SpectrumVector,
  category: SpectrumMatchCategory,
  limit: number,
  statStats: StatPopulationStats,
): SpectrumMatchEvidence[] {
  const candidates: (SpectrumMatchEvidence & { strength: number })[] = []

  for (const { axis, targetValue, candidateValue } of getSpectrumMatchComparison(target, candidate, category)) {
    const isTendency = TENDENCY_KEYS.includes(axis as (typeof TENDENCY_KEYS)[number])

    if (isTendency) {
      const bothDirectional = Math.abs(targetValue) > 10 && Math.abs(candidateValue) > 10
      if (!bothDirectional) continue

      const sameDirection = Math.sign(targetValue) === Math.sign(candidateValue)
      if (category === 'opposite' ? sameDirection : !sameDirection) continue

      // 치우침 폭 절반(50) 대비 강도 — 능력·덕목의 σ 강도와 같은 0~1대 척도
      candidates.push({
        axis,
        targetValue,
        candidateValue,
        strength: Math.min(Math.abs(targetValue), Math.abs(candidateValue)) / 50,
      })
      continue
    }

    const stat = statStats[axis as StatKey]
    const targetZ = axisZ(targetValue, stat)
    const candidateZ = axisZ(candidateValue, stat)
    const bothHigh =
      targetZ >= STAT_EVIDENCE_MIN_Z &&
      candidateZ >= STAT_EVIDENCE_MIN_Z
    if (!bothHigh) continue

    candidates.push({
      axis,
      targetValue,
      candidateValue,
      direction: 'high',
      strength: Math.min(targetZ, candidateZ) / Z_CLAMP,
    })
  }

  return candidates
    .sort((a, b) => b.strength - a.strength || String(a.axis).localeCompare(String(b.axis)))
    .slice(0, limit)
    .map(({ axis, targetValue, candidateValue, direction }) => ({
      axis,
      targetValue,
      candidateValue,
      ...(direction ? { direction } : {}),
    }))
}

/**
 * 인물 지문 — 집단에서 1σ 이상 벗어난 축을 이탈 순으로 추린다.
 * 능력·덕목은 상·하위, 성향은 치우친 쪽의 극단 백분위를 함께 담는다.
 */
export function getSpectrumHighlights(
  target: SpectrumStats,
  population: readonly SpectrumStats[],
  statStats: StatPopulationStats,
  limit: number = 3,
): SpectrumHighlight[] {
  const count = population.length
  if (count === 0) return []

  const candidates: (SpectrumHighlight & { deviation: number })[] = []

  for (const axis of STAT_KEYS) {
    const value = target[axis]
    const z = axisZ(value, statStats[axis])
    if (Math.abs(z) < HIGHLIGHT_MIN_Z) continue

    const direction: 'high' | 'low' = z > 0 ? 'high' : 'low'
    const moreExtreme = population.reduce(
      (acc, row) => acc + (direction === 'high' ? (row[axis] > value ? 1 : 0) : (row[axis] < value ? 1 : 0)),
      0,
    )
    candidates.push({
      axis,
      direction,
      value,
      percentile: Math.max(1, Math.round(((moreExtreme + 1) / count) * 100)),
      deviation: Math.abs(z),
    })
  }

  for (const axis of TENDENCY_KEYS) {
    const value = target[axis]
    // 성향은 절대 치우침 자체가 특징이다. ±50 폭에서 30 이상(60%)을 뚜렷한 극단으로 본다
    if (Math.abs(value) < 30) continue

    const direction: 'high' | 'low' = value > 0 ? 'high' : 'low'
    const moreExtreme = population.reduce(
      (acc, row) => acc + (direction === 'high' ? (row[axis] > value ? 1 : 0) : (row[axis] < value ? 1 : 0)),
      0,
    )
    candidates.push({
      axis,
      direction,
      value,
      percentile: Math.max(1, Math.round(((moreExtreme + 1) / count) * 100)),
      deviation: Math.abs(value) / 20, // σ 단위와 얼추 맞는 강도로 환산해 능력·덕목과 섞어 정렬
    })
  }

  return candidates
    .sort((a, b) => b.deviation - a.deviation || a.percentile - b.percentile)
    .slice(0, limit)
    .map(({ axis, percentile, direction, value }) => ({ axis, percentile, direction, value }))
}

/** 상위 매칭 인물의 상세 모달에서 비교할 해당 분류 전체 축 */
export function getSpectrumMatchComparison(
  target: SpectrumVector,
  candidate: SpectrumVector,
  category: SpectrumMatchCategory,
): SpectrumMatchEvidence[] {
  const keys: readonly (keyof SpectrumStats)[] = (() => {
    switch (category) {
      case 'overall':
        return [...STAT_KEYS, ...TENDENCY_KEYS]
      case 'disposition':
      case 'opposite':
        return TENDENCY_KEYS
      case 'virtue':
        return VIRTUE_KEYS
      case 'ability':
        return ABILITY_KEYS
    }
  })()

  return keys.map((axis) => ({
      axis,
      targetValue: target[axis],
      candidateValue: candidate[axis],
    }))
}

/** 차원 수가 다른 비교 묶음의 거리를 동일한 0~100% 척도로 변환 */
export function groupedDistanceToMatchPercent(
  distance: number,
  dimensions: number,
): number {
  const maxDistance = Math.sqrt(dimensions * 10000)
  return Math.round(Math.max(0, (1 - distance / maxDistance)) * 100)
}

/**
 * 유클리드 거리 계산 (16차원: 스탯 12 + 성향 4)
 * 스탯(0~100)과 성향(-50~+50)은 범위가 같으므로(100) 가중치 불필요
 */
export function calcDistance(a: SpectrumVector, b: SpectrumVector): number {
  let sum = 0
  for (const key of STAT_KEYS) {
    sum += (a[key] - b[key]) ** 2
  }
  for (const key of TENDENCY_KEYS) {
    sum += (a[key] - b[key]) ** 2
  }
  return Math.sqrt(sum)
}

/** 유클리드 거리를 0~100% 일치도로 변환 (최대 거리 = sqrt(16*100^2) = 400) */
export function distanceToMatchPercent(distance: number): number {
  const maxDistance = Math.sqrt(16 * 10000) // 400
  return Math.round(Math.max(0, (1 - distance / maxDistance)) * 100)
}
