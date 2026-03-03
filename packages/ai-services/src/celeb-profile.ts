// 셀럽 프로필 타입 및 영향력 계산 유틸

// #region Types
export interface CelebProfileInput {
  name: string
  description: string
}

export interface GeneratedCelebProfile {
  bio: string
  profession: string
  title?: string
  nationality?: string
  birthDate?: string
  deathDate?: string
  quotes?: string
  fullname?: string
}

export interface GenerateCelebProfileResult {
  success: boolean
  profile?: GeneratedCelebProfile
  error?: string
}

// 영향력 관련 타입
export interface InfluenceScore {
  score: number
  exp: string
}

export interface GeneratedInfluence {
  political: InfluenceScore
  strategic: InfluenceScore
  tech: InfluenceScore
  social: InfluenceScore
  economic: InfluenceScore
  cultural: InfluenceScore
  transhistoricity: InfluenceScore
  totalScore: number
  rank: 'S' | 'A' | 'B' | 'C' | 'D'
}

export interface GeneratedCelebProfileWithInfluence extends GeneratedCelebProfile {
  influence: GeneratedInfluence
}

export interface GenerateCelebProfileWithInfluenceResult {
  success: boolean
  profile?: GeneratedCelebProfileWithInfluence
  error?: string
}

export interface GenerateCelebInfluenceResult {
  success: boolean
  influence?: GeneratedInfluence
  error?: string
}
// #endregion

// 영향력 랭크 계산
export { calculateInfluenceRank } from './prompts/influence-rulebook'
