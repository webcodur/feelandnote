// ── 페르소나 타입 단일원천 (persona jsonb 정본) ──

import type { AbilityKey, InnerVirtueKey, OuterVirtueKey, TendencyKey } from './constants'

/** jsonb 개별 필드 */
export interface PersonaField {
  score: number
  reason_ko: string
  reason_en: string
}

/** 4그룹 타입 */
type PersonaAbilities = Record<AbilityKey, PersonaField>
type PersonaInnerVirtues = Record<InnerVirtueKey, PersonaField>
type PersonaOuterVirtues = Record<OuterVirtueKey, PersonaField>
type PersonaDispositions = Record<TendencyKey, PersonaField>

/** DB persona jsonb 전체 구조 */
export interface PersonaJsonb {
  abilities: PersonaAbilities
  inner_virtues: PersonaInnerVirtues
  outer_virtues: PersonaOuterVirtues
  dispositions: PersonaDispositions
  rationale_ko: string
  rationale_en: string
}

/** 순수 수치 16개 — flat 구조 (게임/거리계산/UI 공통) */
export interface PersonaStats {
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

/** jsonb → PersonaStats 파서 */
export function parsePersonaJsonb(jsonb: PersonaJsonb): PersonaStats {
  const extract = (group: Record<string, PersonaField>) =>
    Object.fromEntries(Object.entries(group).map(([k, v]) => [k, v.score]))
  return {
    ...extract(jsonb.abilities),
    ...extract(jsonb.inner_virtues),
    ...extract(jsonb.outer_virtues),
    ...extract(jsonb.dispositions),
  } as unknown as PersonaStats
}

type PersonaStatWithReason = { score: number; reason_ko: string; reason_en: string };
export type PersonaStatsWithReasons = Record<string, PersonaStatWithReason>;

/** jsonb → PersonaStatsWithReasons 파서 */
export function parsePersonaJsonbWithReasons(jsonb: PersonaJsonb): PersonaStatsWithReasons {
  const extract = (group: Record<string, PersonaField>) =>
    Object.fromEntries(Object.entries(group).map(([k, v]) => [k, { score: v.score, reason_ko: v.reason_ko, reason_en: v.reason_en }]))
  return {
    ...extract(jsonb.abilities),
    ...extract(jsonb.inner_virtues),
    ...extract(jsonb.outer_virtues),
    ...extract(jsonb.dispositions),
  } as unknown as PersonaStatsWithReasons
}

/** UI용: 스탯 + 프로필 메타 */
export interface PersonaProfile extends PersonaStats {
  celeb_id: string
  nickname: string
  nickname_en: string | null
  profession: string | null
  avatar_url: string | null
  birth_date: string | null
  death_date: string | null
  title: string | null
}
