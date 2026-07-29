import type { CelebContentResearchStatus } from '@feelandnote/shared/constants/celeb-content-research'

export const CONTENT_RESEARCH_BUCKETS = [
  'promote_audit',
  'active_target',
  'active_extract',
  'active_full',
  'inactive_target',
  'inactive_extract',
  'inactive_triage',
  'confirmed_empty',
] as const

export type ContentResearchBucket = (typeof CONTENT_RESEARCH_BUCKETS)[number]

export interface CandidateTitleEvidence {
  title: string
  context: string
}

export interface ContentResearchRow {
  id: string
  slug: string | null
  nickname: string
  avatarUrl: string | null
  profession: string | null
  birthDate: string | null
  deathDate: string | null
  profileStatus: string
  influenceTotal: number
  factionLinked: boolean
  journey: string | null
  candidateTitles: string[]
  candidateTitleEvidence: CandidateTitleEvidence[]
  actualContentCount: number
  displayContentCount: number
  researchStatus: CelebContentResearchStatus
  researchUpdatedAt: string | null
  confirmedEmptyAt: string | null
  bucket: ContentResearchBucket
  triageScore: number
  triageSignals: string[]
}

export interface ContentResearchWorkspace {
  rows: ContentResearchRow[]
  total: number
  page: number
  totalPages: number
  bucketCounts: Record<ContentResearchBucket, number>
  statusCounts: Record<CelebContentResearchStatus, number>
}

export interface GetContentResearchParams {
  page?: number
  limit?: number
  search?: string
  bucket?: ContentResearchBucket | 'all'
  researchStatus?: CelebContentResearchStatus | 'all'
}
