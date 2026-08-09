import {
  ABILITY_KEYS,
  STAT_KEYS,
  TENDENCY_KEYS,
  VIRTUE_KEYS,
  type VirtueKey,
} from './constants'
import type { PersonaProfile, PersonaStats } from './types'

/** @deprecated PersonaProfile를 직접 사용하세요 */
export type PersonaVector = PersonaProfile

export interface SimilarCeleb extends PersonaProfile {
  distance: number
}

export type PersonaMatchCategory = 'overall' | 'disposition' | 'virtue' | 'ability' | 'opposite'

export interface PersonaMatchEvidence {
  axis: keyof PersonaStats
  targetValue: number
  candidateValue: number
}

export interface PersonaMatch {
  celeb_id: string
  nickname: string
  avatar_url: string | null
  distance: number
  matchPercent: number
  evidence: PersonaMatchEvidence[]
  comparison: PersonaMatchEvidence[]
}

export type PersonaMatchGroups = Record<PersonaMatchCategory, PersonaMatch[]>

export type PersonaMatchDistances = Record<PersonaMatchCategory, number>

export interface VirtuePopulationStat {
  mean: number
  standardDeviation: number
}

export type VirtuePopulationStats = Record<VirtueKey, VirtuePopulationStat>
export type EmphasizedVirtueVector = Record<VirtueKey, number>

/** 중시 덕목은 한 인물에게 가장 두드러진 덕목까지만 비교한다. */
export const EMPHASIZED_VIRTUE_LIMIT = 3

/** 활성 인물 모집단에서 각 덕목의 평균과 표준편차를 구한다. */
export function calcVirtuePopulationStats(
  personas: readonly PersonaStats[],
): VirtuePopulationStats {
  const count = personas.length
  const sums = Object.fromEntries(
    VIRTUE_KEYS.map((axis) => [axis, 0]),
  ) as Record<VirtueKey, number>

  for (const persona of personas) {
    for (const axis of VIRTUE_KEYS) sums[axis] += persona[axis]
  }

  const means = Object.fromEntries(
    VIRTUE_KEYS.map((axis) => [axis, count > 0 ? sums[axis] / count : 0]),
  ) as Record<VirtueKey, number>
  const squaredDifferences = Object.fromEntries(
    VIRTUE_KEYS.map((axis) => [axis, 0]),
  ) as Record<VirtueKey, number>

  for (const persona of personas) {
    for (const axis of VIRTUE_KEYS) {
      squaredDifferences[axis] += (persona[axis] - means[axis]) ** 2
    }
  }

  return Object.fromEntries(
    VIRTUE_KEYS.map((axis) => [
      axis,
      {
        mean: means[axis],
        standardDeviation:
          count > 0 ? Math.sqrt(squaredDifferences[axis] / count) : 0,
      },
    ]),
  ) as VirtuePopulationStats
}

/**
 * 축별 점수 분포 차이를 보정한 뒤 평균보다 높은 덕목 중 상위 축만 남긴다.
 * 예: 모집단 전체가 높은 근면 점수가 다른 덕목보다 무조건 강점으로 잡히는 일을 막는다.
 */
export function getEmphasizedVirtueVector(
  persona: PersonaStats,
  populationStats: VirtuePopulationStats,
  limit: number = EMPHASIZED_VIRTUE_LIMIT,
): EmphasizedVirtueVector {
  const strengths = VIRTUE_KEYS.map((axis) => {
    const { mean, standardDeviation } = populationStats[axis]
    return {
      axis,
      value:
        standardDeviation > 0
          ? Math.max(0, (persona[axis] - mean) / standardDeviation)
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

/** 카드와 상세 비교에 표시할 공통 중시 덕목. */
export function getEmphasizedVirtueEvidence(
  target: PersonaStats,
  candidate: PersonaStats,
  targetEmphasizedVirtues: EmphasizedVirtueVector,
  candidateEmphasizedVirtues: EmphasizedVirtueVector,
  limit: number,
): PersonaMatchEvidence[] {
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

/**
 * 후보 한 명의 5가지 비교 거리를 한 번의 지표 순회로 계산한다.
 * 반대 성향은 능력·덕목을 건드리지 않고 성향 4축의 부호만 뒤집어 비교한다.
 */
export function calcPersonaMatchDistances(
  target: PersonaVector,
  candidate: PersonaVector,
): PersonaMatchDistances {
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
 * 단순히 차이가 작은 중립값보다, 서로 닮은 방향이 뚜렷한 축을 조금 우선한다.
 */
export function getPersonaMatchEvidence(
  target: PersonaVector,
  candidate: PersonaVector,
  category: PersonaMatchCategory,
  limit: number,
): PersonaMatchEvidence[] {
  return getPersonaMatchComparison(target, candidate, category)
    .map(({ axis, targetValue, candidateValue }) => {
      const isTendency = TENDENCY_KEYS.includes(axis as (typeof TENDENCY_KEYS)[number])
      const midpoint = isTendency ? 0 : 50
      const difference = category === 'opposite'
        ? Math.abs(-targetValue - candidateValue)
        : Math.abs(targetValue - candidateValue)
      const salience = (Math.abs(targetValue - midpoint) + Math.abs(candidateValue - midpoint)) / 2

      return {
        axis,
        targetValue,
        candidateValue,
        isTendency,
        rankScore: difference - salience * 0.15,
      }
    })
    .filter(({ targetValue, candidateValue, isTendency }) => {
      if (!isTendency) return true

      const bothDirectional = Math.abs(targetValue) > 10 && Math.abs(candidateValue) > 10
      if (!bothDirectional) return false

      const sameDirection = Math.sign(targetValue) === Math.sign(candidateValue)
      return category === 'opposite' ? !sameDirection : sameDirection
    })
    .sort((a, b) => a.rankScore - b.rankScore || String(a.axis).localeCompare(String(b.axis)))
    .slice(0, limit)
    .map(({ axis, targetValue, candidateValue }) => ({
      axis,
      targetValue,
      candidateValue,
    }))
}

/** 상위 매칭 인물의 상세 모달에서 비교할 해당 분류 전체 축 */
export function getPersonaMatchComparison(
  target: PersonaVector,
  candidate: PersonaVector,
  category: PersonaMatchCategory,
): PersonaMatchEvidence[] {
  const keys: readonly (keyof PersonaStats)[] = (() => {
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

/** 특정 지표 묶음만 비교하는 유클리드 거리 */
export function calcDistanceByKeys(
  a: PersonaVector,
  b: PersonaVector,
  keys: readonly (keyof PersonaProfile)[],
): number {
  let sum = 0
  for (const key of keys) {
    const aValue = a[key]
    const bValue = b[key]
    if (typeof aValue !== 'number' || typeof bValue !== 'number') continue
    sum += (aValue - bValue) ** 2
  }
  return Math.sqrt(sum)
}

/** 성향 4축의 방향을 뒤집은 거울상과 후보 사이의 거리 */
export function calcOppositeDispositionDistance(
  target: PersonaVector,
  candidate: PersonaVector,
): number {
  let sum = 0
  for (const key of TENDENCY_KEYS) {
    sum += (-target[key] - candidate[key]) ** 2
  }
  return Math.sqrt(sum)
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
export function calcDistance(a: PersonaVector, b: PersonaVector): number {
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
