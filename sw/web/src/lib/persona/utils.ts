import {
  STAT_KEYS,
  TENDENCY_KEYS,
} from './constants'
import type { PersonaProfile } from './types'

/** @deprecated PersonaProfile를 직접 사용하세요 */
export type PersonaVector = PersonaProfile

export interface SimilarCeleb extends PersonaProfile {
  distance: number
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
