import {
  STAT_KEYS,
  TENDENCY_KEYS,
  type StatKey,
  type TendencyKey,
  type VirtueKey,
  type AbilityKey,
} from './constants'

export interface PersonaVector {
  celeb_id: string
  nickname: string
  profession: string | null
  avatar_url: string | null
  influence_score: number
  birth_date: string | null
  death_date: string | null
  title: string | null
  // 덕목 (0~100)
  temperance: number
  diligence: number
  reflection: number
  courage: number
  loyalty: number
  benevolence: number
  fairness: number
  humility: number
  // 능력 (0~100)
  command: number
  martial: number
  intellect: number
  charisma: number
  // 성향 (-50~+50)
  pessimism_optimism: number
  conservative_progressive: number
  individual_social: number
  cautious_bold: number
}

export interface SimilarCeleb extends PersonaVector {
  distance: number
}

/** 스탯 값(0~100)을 0~1 비율로 변환 (레이더 차트용) */
export function normalizeStat(value: number): number {
  return value / 100
}

/** 성향 값(-50~+50)을 0~1 비율로 변환 */
export function normalizeTendency(value: number): number {
  return (value + 50) / 100
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

/** 벡터 배열에서 target 기준 유사 인물 N명 추출 */
export function getSimilarCelebs(
  target: PersonaVector,
  vectors: PersonaVector[],
  excludeId: string | null,
  limit: number = 5
): SimilarCeleb[] {
  return vectors
    .filter((v) => v.celeb_id !== excludeId)
    .map((v) => ({ ...v, distance: calcDistance(target, v) }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit)
}
