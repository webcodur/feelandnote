// ── 스펙트럼 타입 단일원천 (spectrum jsonb 정본) ──

import type { AbilityKey, InnerVirtueKey, OuterVirtueKey, TendencyKey } from './constants'

/** jsonb 개별 필드 */
export interface SpectrumField {
  score: number
  reason_ko: string
  reason_en: string
}

/** 4그룹 타입 */
type SpectrumAbilities = Record<AbilityKey, SpectrumField>
type SpectrumInnerVirtues = Record<InnerVirtueKey, SpectrumField>
type SpectrumOuterVirtues = Record<OuterVirtueKey, SpectrumField>
type SpectrumDispositions = Record<TendencyKey, SpectrumField>

/** DB spectrum jsonb 전체 구조 */
export interface SpectrumJsonb {
  abilities: SpectrumAbilities
  inner_virtues: SpectrumInnerVirtues
  outer_virtues: SpectrumOuterVirtues
  dispositions: SpectrumDispositions
  rationale_ko: string
  rationale_en: string
}

/** 순수 수치 16개 — flat 구조 (게임/거리계산/UI 공통) */
export interface SpectrumStats {
  command: number
  martial: number
  intellect: number
  charm: number
  temperance: number
  diligence: number
  reflection: number
  courage: number
  loyalty: number
  benevolence: number
  fairness: number
  humility: number
  pessimism_optimism: number
  conservative_progressive: number
  individual_social: number
  cautious_bold: number
}

/** jsonb → SpectrumStats 파서 */
export function parseSpectrumJsonb(jsonb: SpectrumJsonb): SpectrumStats {
  const extract = (group: Record<string, SpectrumField>) =>
    Object.fromEntries(Object.entries(group).map(([k, v]) => [k, v.score]))
  return {
    ...extract(jsonb.abilities),
    ...extract(jsonb.inner_virtues),
    ...extract(jsonb.outer_virtues),
    ...extract(jsonb.dispositions),
  } as unknown as SpectrumStats
}

type SpectrumStatWithReason = { score: number; reason_ko: string; reason_en: string };
export type SpectrumStatsWithReasons = Record<string, SpectrumStatWithReason>;

/** jsonb → SpectrumStatsWithReasons 파서 */
export function parseSpectrumJsonbWithReasons(jsonb: SpectrumJsonb): SpectrumStatsWithReasons {
  const extract = (group: Record<string, SpectrumField>) =>
    Object.fromEntries(Object.entries(group).map(([k, v]) => [k, { score: v.score, reason_ko: v.reason_ko, reason_en: v.reason_en }]))
  return {
    ...extract(jsonb.abilities),
    ...extract(jsonb.inner_virtues),
    ...extract(jsonb.outer_virtues),
    ...extract(jsonb.dispositions),
  } as unknown as SpectrumStatsWithReasons
}

/** UI용: 스탯 + 프로필 메타 */
export interface SpectrumProfile extends SpectrumStats {
  celeb_id: string
  nickname: string
  nickname_en: string | null
  profession: string | null
  avatar_url: string | null
  birth_date: string | null
  death_date: string | null
  title: string | null
}
