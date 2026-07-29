import type { CelebContentResearchStatus } from '@feelandnote/shared/constants/celeb-content-research'

export const CONTENT_RESEARCH_BUCKETS = [
  'promote_audit',
  'active_research',
  'inactive_triage',
  'confirmed_empty',
] as const

export type ContentResearchBucket = (typeof CONTENT_RESEARCH_BUCKETS)[number]

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

export const CONTENT_RESEARCH_TYPES = ['BOOK', 'VIDEO', 'GAME', 'MUSIC'] as const
export type ContentResearchType = (typeof CONTENT_RESEARCH_TYPES)[number]

export const CONTENT_RESEARCH_RUN_STATUSES = [
  'in_progress',
  'completed',
  'cancelled',
] as const
export type ContentResearchRunStatus = (typeof CONTENT_RESEARCH_RUN_STATUSES)[number]

export const CONTENT_RESEARCH_SCOPE_STATUSES = [
  'pending',
  'in_progress',
  'completed',
] as const
export type ContentResearchScopeStatus =
  (typeof CONTENT_RESEARCH_SCOPE_STATUSES)[number]

export const CONTENT_RESEARCH_FINDING_DECISIONS = [
  'candidate',
  'accepted',
  'rejected',
] as const
export type ContentResearchFindingDecision =
  (typeof CONTENT_RESEARCH_FINDING_DECISIONS)[number]

export const CONTENT_RESEARCH_SOURCE_TIERS = ['primary', 'secondary'] as const
export type ContentResearchSourceTier =
  (typeof CONTENT_RESEARCH_SOURCE_TIERS)[number]

export const CONTENT_RESEARCH_SOURCE_KINDS = [
  'direct_statement',
  'interview',
  'official_profile',
  'social_post',
  'transcript',
  'archive',
  'article',
  'other',
] as const
export type ContentResearchSourceKind =
  (typeof CONTENT_RESEARCH_SOURCE_KINDS)[number]

export const CONTENT_RESEARCH_ACCESS_STATUSES = [
  'accessible',
  'bot_blocked',
  'archived',
  'unavailable',
] as const
export type ContentResearchAccessStatus =
  (typeof CONTENT_RESEARCH_ACCESS_STATUSES)[number]

export interface ContentResearchSource {
  id: string
  runId: string
  contentType: ContentResearchType
  findingId: string | null
  url: string
  sourceTier: ContentResearchSourceTier
  sourceKind: ContentResearchSourceKind
  accessStatus: ContentResearchAccessStatus
  title: string | null
  notes: string | null
  checkedAt: string
}

export interface ContentResearchFinding {
  id: string
  runId: string
  contentType: ContentResearchType
  decision: ContentResearchFindingDecision
  title: string
  creator: string | null
  contentId: string | null
  evidenceSummary: string | null
  rejectionReason: string | null
  createdAt: string
  sources: ContentResearchSource[]
}

export interface ContentResearchScope {
  runId: string
  contentType: ContentResearchType
  status: ContentResearchScopeStatus
  searchNotes: string | null
  completedAt: string | null
  findings: ContentResearchFinding[]
  sources: ContentResearchSource[]
}

export interface ContentResearchRun {
  id: string
  celebId: string
  batchKey: string
  status: ContentResearchRunStatus
  researcherId: string | null
  researcherLabel: string
  nameVariants: string[]
  homonymNotes: string | null
  summary: string | null
  startedAt: string
  completedAt: string | null
  scopes: ContentResearchScope[]
}

export interface ContentResearchDetailProfile {
  id: string
  slug: string | null
  nickname: string
  nicknameEn: string | null
  profession: string | null
  profileStatus: string
  celebTier: string | null
  actualContentCount: number
  researchStatus: CelebContentResearchStatus
}

export interface ContentResearchDetail {
  profile: ContentResearchDetailProfile
  runs: ContentResearchRun[]
}

export interface StartContentResearchRunInput {
  celebId: string
  batchKey: string
  researcherLabel: string
  nameVariants: string[]
  homonymNotes?: string | null
}

export interface UpdateContentResearchScopeInput {
  runId: string
  contentType: ContentResearchType
  status: ContentResearchScopeStatus
  searchNotes?: string | null
}

export interface SaveContentResearchFindingInput {
  id?: string
  runId: string
  contentType: ContentResearchType
  decision: ContentResearchFindingDecision
  title: string
  creator?: string | null
  contentId?: string | null
  evidenceSummary?: string | null
  rejectionReason?: string | null
}

export interface SaveContentResearchSourceInput {
  id?: string
  runId: string
  contentType: ContentResearchType
  findingId?: string | null
  url: string
  sourceTier: ContentResearchSourceTier
  sourceKind: ContentResearchSourceKind
  accessStatus: ContentResearchAccessStatus
  title?: string | null
  notes?: string | null
}
