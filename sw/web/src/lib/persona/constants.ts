// ── 덕목 (0~100) ──

export const INNER_VIRTUE_KEYS = ['temperance', 'diligence', 'reflection', 'courage'] as const
export const OUTER_VIRTUE_KEYS = ['loyalty', 'benevolence', 'fairness', 'humility'] as const
export const VIRTUE_KEYS = [...INNER_VIRTUE_KEYS, ...OUTER_VIRTUE_KEYS] as const

export type InnerVirtueKey = (typeof INNER_VIRTUE_KEYS)[number]
export type OuterVirtueKey = (typeof OUTER_VIRTUE_KEYS)[number]
type VirtueKey = (typeof VIRTUE_KEYS)[number]

const VIRTUE_LABELS: Record<VirtueKey, string> = {
  temperance: '절제',
  diligence: '근면',
  reflection: '성찰',
  courage: '용기',
  loyalty: '충의',
  benevolence: '인애',
  fairness: '공정',
  humility: '겸양',
}

// ── 능력 (0~100) ──

export const ABILITY_KEYS = ['command', 'martial', 'intellect', 'charm'] as const
export type AbilityKey = (typeof ABILITY_KEYS)[number]

export const ABILITY_LABELS: Record<AbilityKey, string> = {
  command: '통솔',
  martial: '무력',
  intellect: '지력',
  charm: '매력',
}

// ── 성향 (-50~+50) ──

export const TENDENCY_KEYS = [
  'pessimism_optimism',
  'conservative_progressive',
  'individual_social',
  'cautious_bold',
] as const
export type TendencyKey = (typeof TENDENCY_KEYS)[number]

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

// ── 직군 (기존과 동일) ──

export const PROFESSION_LABELS: Record<string, string> = {
  leader: '지도자',
  politician: '정치인',
  commander: '지휘관',
  entrepreneur: '기업가',
  investor: '투자자',
  humanities_scholar: '인문학자',
  social_scientist: '사회과학자',
  scientist: '과학자',
  director: '감독',
  musician: '음악인',
  visual_artist: '미술인',
  author: '작가',
  actor: '배우',
  influencer: '인플루엔서',
  athlete: '스포츠인',
  other: '기타',
}

