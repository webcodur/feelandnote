import { CELEB_PROFESSIONS } from '@feelandnote/shared/constants/celeb-professions'
import {
  ABILITY_KEYS as SHARED_ABILITY_KEYS,
  AXIS_LABELS,
  DISPOSITION_KEYS,
  INNER_VIRTUE_KEYS as SHARED_INNER_VIRTUE_KEYS,
  OUTER_VIRTUE_KEYS as SHARED_OUTER_VIRTUE_KEYS,
  type AbilityKey as SharedAbilityKey,
  type DispositionKey,
  type InnerVirtueKey as SharedInnerVirtueKey,
  type OuterVirtueKey as SharedOuterVirtueKey,
} from '@feelandnote/shared/constants/celeb-spectrum-scale'

// ── 덕목 (0~100) ──

export const INNER_VIRTUE_KEYS = SHARED_INNER_VIRTUE_KEYS
export const OUTER_VIRTUE_KEYS = SHARED_OUTER_VIRTUE_KEYS
export const VIRTUE_KEYS = [...INNER_VIRTUE_KEYS, ...OUTER_VIRTUE_KEYS] as const

export type InnerVirtueKey = SharedInnerVirtueKey
export type OuterVirtueKey = SharedOuterVirtueKey
export type VirtueKey = (typeof VIRTUE_KEYS)[number]

const VIRTUE_LABELS = Object.fromEntries(
  VIRTUE_KEYS.map((key) => [key, AXIS_LABELS[key]]),
) as Record<VirtueKey, string>

// ── 능력 (0~100) ──

export const ABILITY_KEYS = SHARED_ABILITY_KEYS
export type AbilityKey = SharedAbilityKey

export const ABILITY_LABELS = Object.fromEntries(
  ABILITY_KEYS.map((key) => [key, AXIS_LABELS[key]]),
) as Record<AbilityKey, string>

// ── 성향 (-50~+50) ──

export const TENDENCY_KEYS = DISPOSITION_KEYS
export type TendencyKey = DispositionKey

export const TENDENCY_LABELS: Record<TendencyKey, [string, string]> = {
  pessimism_optimism: ['비관', '낙관'],
  conservative_progressive: ['보수', '진취'],
  individual_social: ['개인', '사회'],
  cautious_bold: ['신중', '과감'],
}

// ── 통합 키 (레이더 등에서 사용) ──

export type StatKey = VirtueKey | AbilityKey

/** 덕목 8 + 능력 4 = 12 스탯 */
export const STAT_KEYS = [...VIRTUE_KEYS, ...ABILITY_KEYS] as const

export const STAT_LABELS: Record<StatKey, string> = {
  ...VIRTUE_LABELS,
  ...ABILITY_LABELS,
}

// ── 직군 ──

export const PROFESSION_LABELS: Record<string, string> = Object.fromEntries(
  CELEB_PROFESSIONS.map(({ value, label }) => [value, label]),
)

