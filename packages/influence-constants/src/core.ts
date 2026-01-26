// 영향력 핵심 상수 - 순수 데이터 (UI 의존성 없음)

// #region 영향력 영역 (6개 + 통시성)
export const INFLUENCE_CATEGORY_FIELDS = ['political', 'strategic', 'tech', 'social', 'economic', 'cultural'] as const
export type InfluenceCategoryField = typeof INFLUENCE_CATEGORY_FIELDS[number]

export const INFLUENCE_FIELDS = [...INFLUENCE_CATEGORY_FIELDS, 'transhistoricity'] as const
export type InfluenceField = typeof INFLUENCE_FIELDS[number]

export const INFLUENCE_LABELS: Record<InfluenceField, string> = {
  political: '정치',
  strategic: '전략',
  tech: '기술',
  social: '사회',
  economic: '경제',
  cultural: '문화',
  transhistoricity: '시대초월성',
}

export const INFLUENCE_MAX_SCORES: Record<InfluenceField, number> = {
  political: 10,
  strategic: 10,
  tech: 10,
  social: 10,
  economic: 10,
  cultural: 10,
  transhistoricity: 40,
}

export const INFLUENCE_TOTAL_MAX_SCORE = 100
// #endregion

// #region 랭크 체계
export const INFLUENCE_RANKS = ['S', 'A', 'B', 'C', 'D'] as const
export type InfluenceRank = typeof INFLUENCE_RANKS[number]

export const INFLUENCE_RANK_THRESHOLDS: Record<InfluenceRank, number> = {
  S: 80,
  A: 60,
  B: 50,
  C: 40,
  D: 0,
}

export const INFLUENCE_RANK_LABELS: Record<InfluenceRank, string> = {
  S: 'Exalted',
  A: 'Elite',
  B: 'Prominent',
  C: 'Established',
  D: 'Rising',
}

export const INFLUENCE_RANK_RANGES: Record<InfluenceRank, string> = {
  S: '80+',
  A: '60-79',
  B: '50-59',
  C: '40-49',
  D: '39 이하',
}

export function calculateInfluenceRank(totalScore: number): InfluenceRank {
  if (totalScore >= INFLUENCE_RANK_THRESHOLDS.S) return 'S'
  if (totalScore >= INFLUENCE_RANK_THRESHOLDS.A) return 'A'
  if (totalScore >= INFLUENCE_RANK_THRESHOLDS.B) return 'B'
  if (totalScore >= INFLUENCE_RANK_THRESHOLDS.C) return 'C'
  return 'D'
}
// #endregion
