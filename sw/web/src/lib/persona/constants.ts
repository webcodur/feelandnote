// ── 덕목 (0~100) ──

export type VirtueKey =
  | 'temperance'
  | 'diligence'
  | 'reflection'
  | 'courage'
  | 'loyalty'
  | 'benevolence'
  | 'fairness'
  | 'humility'

export const VIRTUE_KEYS: VirtueKey[] = [
  'temperance',
  'diligence',
  'reflection',
  'courage',
  'loyalty',
  'benevolence',
  'fairness',
  'humility',
]

export const VIRTUE_LABELS: Record<VirtueKey, string> = {
  temperance: '절제',
  diligence: '근면',
  reflection: '성찰',
  courage: '용기',
  loyalty: '충의',
  benevolence: '인애',
  fairness: '공정',
  humility: '겸양',
}

/** 내적 덕목 vs 외적 덕목 구분 */
export const INNER_VIRTUE_KEYS: VirtueKey[] = ['temperance', 'diligence', 'reflection', 'courage']
export const OUTER_VIRTUE_KEYS: VirtueKey[] = ['loyalty', 'benevolence', 'fairness', 'humility']

// ── 능력 (0~100) ──

export type AbilityKey = 'command' | 'martial' | 'intellect' | 'charisma'

export const ABILITY_KEYS: AbilityKey[] = ['command', 'martial', 'intellect', 'charisma']

export const ABILITY_LABELS: Record<AbilityKey, string> = {
  command: '통솔',
  martial: '무력',
  intellect: '지력',
  charisma: '매력',
}

// ── 성향 (-50~+50) ──

export type TendencyKey =
  | 'pessimism_optimism'
  | 'conservative_progressive'
  | 'individual_social'
  | 'cautious_bold'

export const TENDENCY_KEYS: TendencyKey[] = [
  'pessimism_optimism',
  'conservative_progressive',
  'individual_social',
  'cautious_bold',
]

export const TENDENCY_LABELS: Record<TendencyKey, [string, string]> = {
  pessimism_optimism: ['비관', '낙관'],
  conservative_progressive: ['보수', '진취'],
  individual_social: ['개인', '사회'],
  cautious_bold: ['신중', '과감'],
}

// ── 통합 키 (레이더 등에서 사용) ──

export type StatKey = VirtueKey | AbilityKey

/** 덕목 8 + 능력 4 = 12 스탯 */
export const STAT_KEYS: StatKey[] = [...VIRTUE_KEYS, ...ABILITY_KEYS]

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

export const PROFESSION_COLORS: Record<string, string> = {
  leader: '#d4af37',
  politician: '#ef5350',
  commander: '#ff7043',
  entrepreneur: '#66bb6a',
  investor: '#26c6da',
  humanities_scholar: '#ab47bc',
  social_scientist: '#7e57c2',
  scientist: '#4fc3f7',
  director: '#ec407a',
  musician: '#ffa726',
  visual_artist: '#8d6e63',
  author: '#78909c',
  actor: '#f06292',
  influencer: '#9ccc65',
  athlete: '#29b6f6',
  other: '#bdbdbd',
}

export const CHART_COLORS = [
  '#d4af37',
  '#4fc3f7',
  '#ef5350',
  '#66bb6a',
  '#ab47bc',
  '#ff7043',
  '#26c6da',
  '#ec407a',
  '#8d6e63',
  '#78909c',
]
