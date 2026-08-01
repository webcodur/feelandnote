'use server'

import { revalidatePath } from 'next/cache'
import {
  CELEB_CONTENT_RESEARCH_STATUSES,
  resolveCelebContentCount,
  type CelebContentResearchStatus,
} from '@feelandnote/shared/constants/celeb-content-research'
import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { revalidateWebCache } from '@/lib/revalidate-web'
import {
  CONTENT_RESEARCH_ACCESS_STATUSES,
  CONTENT_RESEARCH_FINDING_DECISIONS,
  CONTENT_RESEARCH_RUN_STATUSES,
  CONTENT_RESEARCH_SCOPE_STATUSES,
  CONTENT_RESEARCH_SOURCE_KINDS,
  CONTENT_RESEARCH_SOURCE_TIERS,
  CONTENT_RESEARCH_TYPES,
  type ContentResearchAccessStatus,
  type ContentResearchBucket,
  type ContentResearchDetail,
  type ContentResearchFinding,
  type ContentResearchFindingDecision,
  type ContentResearchRow,
  type ContentResearchRun,
  type ContentResearchRunStatus,
  type ContentResearchScope,
  type ContentResearchScopeStatus,
  type ContentResearchSource,
  type ContentResearchSourceKind,
  type ContentResearchSourceTier,
  type ContentResearchType,
  type ContentResearchWorkspace,
  type GetContentResearchParams,
  type SaveContentResearchFindingInput,
  type SaveContentResearchSourceInput,
  type StartContentResearchRunInput,
  type UpdateContentResearchScopeInput,
} from './content-research-types'

type ProfileRow = {
  id: string
  slug: string | null
  nickname: string | null
  avatar_url: string | null
  profession: string | null
  birth_date: string | null
  death_date: string | null
  status: string | null
  content_research_status: string | null
  content_research_updated_at: string | null
  content_research_confirmed_empty_at: string | null
  celeb_influence:
    | { total_score: number | null }
    | { total_score: number | null }[]
    | null
}

type ResearchRunRow = {
  id: string
  celeb_id: string
  batch_key: string
  status: string
  researcher_id: string | null
  researcher_label: string
  name_variants: string[]
  homonym_notes: string | null
  summary: string | null
  started_at: string
  completed_at: string | null
}

type ResearchScopeRow = {
  run_id: string
  content_type: string
  status: string
  search_notes: string | null
  completed_at: string | null
}

type ResearchFindingRow = {
  id: string
  run_id: string
  content_type: string
  decision: string
  title: string
  creator: string | null
  content_id: string | null
  evidence_summary: string | null
  rejection_reason: string | null
  created_at: string
}

type ResearchSourceRow = {
  id: string
  run_id: string
  content_type: string
  finding_id: string | null
  url: string
  source_tier: string
  source_kind: string
  access_status: string
  title: string | null
  notes: string | null
  checked_at: string
}

const PAGE_SIZE = 1000
const IN_FILTER_CHUNK = 200
const MODERN_SOURCE_RICH_PROFESSIONS = new Set([
  'entrepreneur',
  'investor',
  'scientist',
  'humanities_scholar',
  'social_scientist',
  'director',
  'musician',
  'visual_artist',
  'author',
  'actor',
  'influencer',
  'athlete',
  'politician',
])

function getSingleRelation<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value
}

function normalizeResearchStatus(value: string | null): CelebContentResearchStatus {
  return CELEB_CONTENT_RESEARCH_STATUSES.includes(value as CelebContentResearchStatus)
    ? (value as CelebContentResearchStatus)
    : 'open'
}

function getBirthYear(value: string | null): number | null {
  if (!value) return null
  const match = value.match(/-?\d{1,4}/)
  if (!match) return null
  const year = Number(match[0])
  return Number.isFinite(year) ? year : null
}

function getTriageSignals(
  profile: ProfileRow,
  influenceTotal: number,
  factionLinked: boolean
): { score: number; signals: string[] } {
  const signals: string[] = []
  let score = 0

  if (influenceTotal >= 50) {
    score += 3
    signals.push(`영향력 ${influenceTotal}`)
  } else if (influenceTotal >= 35) {
    score += 2
    signals.push(`영향력 ${influenceTotal}`)
  }

  const birthYear = getBirthYear(profile.birth_date)
  const isModern = birthYear !== null && birthYear >= 1850
  if (isModern && profile.profession && MODERN_SOURCE_RICH_PROFESSIONS.has(profile.profession)) {
    score += 2
    signals.push('현대·자료풍부 직군')
  }

  if (factionLinked) {
    score += 1
    signals.push('세력도감 연결')
  }

  if (signals.length === 0) signals.push('뚜렷한 선행 신호 없음')
  return { score, signals }
}

function deriveBucket(
  profileStatus: string,
  actualContentCount: number,
  researchStatus: CelebContentResearchStatus
): ContentResearchBucket {
  if (actualContentCount === 0 && researchStatus === 'confirmed_empty') {
    return 'confirmed_empty'
  }
  if (actualContentCount > 0) return 'promote_audit'

  return profileStatus === 'active' ? 'active_research' : 'inactive_triage'
}

async function getAllLightProfiles(): Promise<ProfileRow[]> {
  const admin = createAdminClient()
  const rows: ProfileRow[] = []

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await admin
      .from('profiles')
      .select(`
        id, slug, nickname, avatar_url, profession, birth_date, death_date,
        status, content_research_status, content_research_updated_at,
        content_research_confirmed_empty_at,
        celeb_influence(total_score)
      `)
      .eq('profile_type', 'CELEB')
      .eq('celeb_tier', 'light')
      .in('status', ['active', 'inactive'])
      .order('id', { ascending: true })
      .range(from, from + PAGE_SIZE - 1)

    if (error) throw error
    const batch = (data ?? []) as unknown as ProfileRow[]
    rows.push(...batch)
    if (batch.length < PAGE_SIZE) break
  }

  return rows
}

async function getContentCounts(celebIds: string[]): Promise<Map<string, number>> {
  const admin = createAdminClient()
  const counts = new Map<string, number>()

  for (let chunkStart = 0; chunkStart < celebIds.length; chunkStart += IN_FILTER_CHUNK) {
    const ids = celebIds.slice(chunkStart, chunkStart + IN_FILTER_CHUNK)

    for (let from = 0; ; from += PAGE_SIZE) {
      const { data, error } = await admin
        .from('user_contents')
        .select('id, user_id')
        .in('user_id', ids)
        .order('id', { ascending: true })
        .range(from, from + PAGE_SIZE - 1)

      if (error) throw error
      const batch = data ?? []
      for (const row of batch) {
        counts.set(row.user_id, (counts.get(row.user_id) ?? 0) + 1)
      }
      if (batch.length < PAGE_SIZE) break
    }
  }

  return counts
}

async function getFactionLinkedIds(celebIds: string[]): Promise<Set<string>> {
  const admin = createAdminClient()
  const linkedIds = new Set<string>()

  for (let chunkStart = 0; chunkStart < celebIds.length; chunkStart += IN_FILTER_CHUNK) {
    const ids = celebIds.slice(chunkStart, chunkStart + IN_FILTER_CHUNK)

    for (let from = 0; ; from += PAGE_SIZE) {
      const { data, error } = await admin
        .from('celeb_tag_assignments')
        .select('id, celeb_id')
        .in('celeb_id', ids)
        .order('id', { ascending: true })
        .range(from, from + PAGE_SIZE - 1)

      if (error) throw error
      const batch = data ?? []
      for (const row of batch) linkedIds.add(row.celeb_id)
      if (batch.length < PAGE_SIZE) break
    }
  }

  return linkedIds
}

function emptyBucketCounts(): Record<ContentResearchBucket, number> {
  return {
    promote_audit: 0,
    active_research: 0,
    inactive_triage: 0,
    confirmed_empty: 0,
  }
}

function emptyStatusCounts(): Record<CelebContentResearchStatus, number> {
  return {
    open: 0,
    researching: 0,
    confirmed_empty: 0,
  }
}

export async function getContentResearchWorkspace(
  params: GetContentResearchParams = {}
): Promise<ContentResearchWorkspace> {
  const {
    page = 1,
    limit = 50,
    search = '',
    bucket = 'all',
    researchStatus = 'all',
  } = params

  const profiles = await getAllLightProfiles()
  const celebIds = profiles.map((profile) => profile.id)
  const [contentCounts, factionLinkedIds] = await Promise.all([
    getContentCounts(celebIds),
    getFactionLinkedIds(celebIds),
  ])

  const allRows = profiles.map((profile): ContentResearchRow => {
    const influence = getSingleRelation(profile.celeb_influence)
    const influenceTotal = influence?.total_score ?? 0
    const factionLinked = factionLinkedIds.has(profile.id)
    const actualContentCount = contentCounts.get(profile.id) ?? 0
    const normalizedResearchStatus = normalizeResearchStatus(profile.content_research_status)
    const { score, signals } = getTriageSignals(profile, influenceTotal, factionLinked)
    const profileStatus = profile.status ?? 'inactive'

    return {
      id: profile.id,
      slug: profile.slug,
      nickname: profile.nickname ?? '이름 없음',
      avatarUrl: profile.avatar_url,
      profession: profile.profession,
      birthDate: profile.birth_date,
      deathDate: profile.death_date,
      profileStatus,
      influenceTotal,
      factionLinked,
      actualContentCount,
      displayContentCount: resolveCelebContentCount(
        actualContentCount,
        normalizedResearchStatus,
        profileStatus === 'active'
      ),
      researchStatus: normalizedResearchStatus,
      researchUpdatedAt: profile.content_research_updated_at,
      confirmedEmptyAt: profile.content_research_confirmed_empty_at,
      bucket: deriveBucket(
        profileStatus,
        actualContentCount,
        normalizedResearchStatus
      ),
      triageScore: score,
      triageSignals: signals,
    }
  })

  const bucketCounts = emptyBucketCounts()
  const statusCounts = emptyStatusCounts()
  for (const row of allRows) {
    bucketCounts[row.bucket] += 1
    statusCounts[row.researchStatus] += 1
  }

  const normalizedSearch = search.trim().toLocaleLowerCase('ko')
  const filteredRows = allRows
    .filter((row) => bucket === 'all' || row.bucket === bucket)
    .filter((row) => researchStatus === 'all' || row.researchStatus === researchStatus)
    .filter((row) => {
      if (!normalizedSearch) return true
      return (
        row.nickname.toLocaleLowerCase('ko').includes(normalizedSearch) ||
        row.slug?.toLocaleLowerCase('en').includes(normalizedSearch)
      )
    })
    .sort((left, right) => {
      if (left.bucket === 'inactive_triage' && right.bucket === 'inactive_triage') {
        const triageDifference = right.triageScore - left.triageScore
        if (triageDifference !== 0) return triageDifference
      }
      const influenceDifference = right.influenceTotal - left.influenceTotal
      if (influenceDifference !== 0) return influenceDifference
      return left.nickname.localeCompare(right.nickname, 'ko')
    })

  const safePage = Math.max(1, page)
  const offset = (safePage - 1) * limit
  return {
    rows: filteredRows.slice(offset, offset + limit),
    total: filteredRows.length,
    page: safePage,
    totalPages: Math.ceil(filteredRows.length / limit),
    bucketCounts,
    statusCounts,
  }
}

async function assertAdmin(): Promise<{ id: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error('인증이 필요합니다.')

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (error || !profile || !['admin', 'super_admin'].includes(profile.role ?? '')) {
    throw new Error('관리자 권한이 필요합니다.')
  }

  return { id: user.id }
}

export async function updateContentResearchStatus(
  celebId: string,
  nextStatus: CelebContentResearchStatus
): Promise<void> {
  await assertAdmin()

  if (!CELEB_CONTENT_RESEARCH_STATUSES.includes(nextStatus)) {
    throw new Error('유효하지 않은 조사 상태입니다.')
  }

  if (nextStatus === 'confirmed_empty') {
    throw new Error(
      '없음 확정은 조사 장부에서 BOOK·VIDEO·GAME·MUSIC 네 유형을 완료해야 합니다.'
    )
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('profiles')
    .update({ content_research_status: nextStatus })
    .eq('id', celebId)
    .eq('profile_type', 'CELEB')
    .select('id')
    .maybeSingle()

  if (error) throw error
  if (!data) throw new Error('변경할 셀럽 프로필을 찾을 수 없습니다.')

  revalidatePath('/celebs')
  revalidatePath('/celebs/content-research')
  revalidatePath('/celebs/[slug]', 'page')
  await revalidateWebCache(CACHE_TAGS.CELEBS)
}

function requireText(value: string, label: string): string {
  const normalized = value.trim()
  if (!normalized) throw new Error(`${label}을(를) 입력하세요.`)
  return normalized
}

function optionalText(value: string | null | undefined): string | null {
  const normalized = value?.trim() ?? ''
  return normalized || null
}

function normalizeNameVariants(values: string[]): string[] {
  return [
    ...new Set(
      values
        .map((value) => value.trim())
        .filter(Boolean)
    ),
  ]
}

function normalizeContentResearchType(value: string): ContentResearchType {
  if (!CONTENT_RESEARCH_TYPES.includes(value as ContentResearchType)) {
    throw new Error(`알 수 없는 콘텐츠 유형입니다: ${value}`)
  }
  return value as ContentResearchType
}

function normalizeRunStatus(value: string): ContentResearchRunStatus {
  if (!CONTENT_RESEARCH_RUN_STATUSES.includes(value as ContentResearchRunStatus)) {
    throw new Error(`알 수 없는 조사 실행 상태입니다: ${value}`)
  }
  return value as ContentResearchRunStatus
}

function normalizeScopeStatus(value: string): ContentResearchScopeStatus {
  if (!CONTENT_RESEARCH_SCOPE_STATUSES.includes(value as ContentResearchScopeStatus)) {
    throw new Error(`알 수 없는 유형 조사 상태입니다: ${value}`)
  }
  return value as ContentResearchScopeStatus
}

function normalizeFindingDecision(value: string): ContentResearchFindingDecision {
  if (
    !CONTENT_RESEARCH_FINDING_DECISIONS.includes(
      value as ContentResearchFindingDecision
    )
  ) {
    throw new Error(`알 수 없는 후보 판정입니다: ${value}`)
  }
  return value as ContentResearchFindingDecision
}

function normalizeSourceTier(value: string): ContentResearchSourceTier {
  if (!CONTENT_RESEARCH_SOURCE_TIERS.includes(value as ContentResearchSourceTier)) {
    throw new Error(`알 수 없는 출처 등급입니다: ${value}`)
  }
  return value as ContentResearchSourceTier
}

function normalizeSourceKind(value: string): ContentResearchSourceKind {
  if (!CONTENT_RESEARCH_SOURCE_KINDS.includes(value as ContentResearchSourceKind)) {
    throw new Error(`알 수 없는 출처 종류입니다: ${value}`)
  }
  return value as ContentResearchSourceKind
}

function normalizeAccessStatus(value: string): ContentResearchAccessStatus {
  if (
    !CONTENT_RESEARCH_ACCESS_STATUSES.includes(value as ContentResearchAccessStatus)
  ) {
    throw new Error(`알 수 없는 출처 접근 상태입니다: ${value}`)
  }
  return value as ContentResearchAccessStatus
}

function revalidateResearchWorkspace(celebId: string): void {
  revalidatePath('/celebs/content-research')
  revalidatePath(`/celebs/content-research/${celebId}`)
}

async function getRunCelebId(
  admin: ReturnType<typeof createAdminClient>,
  runId: string
): Promise<string> {
  const { data, error } = await admin
    .from('celeb_content_research_runs')
    .select('celeb_id')
    .eq('id', runId)
    .single()

  if (error || !data) throw error ?? new Error('조사 실행을 찾을 수 없습니다.')
  return data.celeb_id
}

export async function getContentResearchDetail(
  celebId: string
): Promise<ContentResearchDetail> {
  await assertAdmin()
  const admin = createAdminClient()

  const [profileResult, contentCountResult, runsResult] = await Promise.all([
    admin
      .from('profiles')
      .select(`
        id, slug, nickname, nickname_en, profession, status, celeb_tier,
        content_research_status
      `)
      .eq('id', celebId)
      .eq('profile_type', 'CELEB')
      .single(),
    admin
      .from('user_contents')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', celebId),
    admin
      .from('celeb_content_research_runs')
      .select(`
        id, celeb_id, batch_key, status, researcher_id, researcher_label,
        name_variants, homonym_notes, summary, started_at, completed_at
      `)
      .eq('celeb_id', celebId)
      .order('started_at', { ascending: false }),
  ])

  if (profileResult.error || !profileResult.data) {
    throw profileResult.error ?? new Error('셀럽 프로필을 찾을 수 없습니다.')
  }
  if (contentCountResult.error) throw contentCountResult.error
  if (runsResult.error) throw runsResult.error

  const profile = profileResult.data
  const runRows = (runsResult.data ?? []) as ResearchRunRow[]
  const runIds = runRows.map((run) => run.id)

  let scopeRows: ResearchScopeRow[] = []
  let findingRows: ResearchFindingRow[] = []
  let sourceRows: ResearchSourceRow[] = []

  if (runIds.length > 0) {
    const [scopesResult, findingsResult, sourcesResult] = await Promise.all([
      admin
        .from('celeb_content_research_scopes')
        .select('run_id, content_type, status, search_notes, completed_at')
        .in('run_id', runIds),
      admin
        .from('celeb_content_research_findings')
        .select(`
          id, run_id, content_type, decision, title, creator, content_id,
          evidence_summary, rejection_reason, created_at
        `)
        .in('run_id', runIds)
        .order('created_at', { ascending: true }),
      admin
        .from('celeb_content_research_sources')
        .select(`
          id, run_id, content_type, finding_id, url, source_tier, source_kind,
          access_status, title, notes, checked_at
        `)
        .in('run_id', runIds)
        .order('checked_at', { ascending: true }),
    ])

    if (scopesResult.error) throw scopesResult.error
    if (findingsResult.error) throw findingsResult.error
    if (sourcesResult.error) throw sourcesResult.error

    scopeRows = (scopesResult.data ?? []) as ResearchScopeRow[]
    findingRows = (findingsResult.data ?? []) as ResearchFindingRow[]
    sourceRows = (sourcesResult.data ?? []) as ResearchSourceRow[]
  }

  const sources: ContentResearchSource[] = sourceRows.map((source) => ({
    id: source.id,
    runId: source.run_id,
    contentType: normalizeContentResearchType(source.content_type),
    findingId: source.finding_id,
    url: source.url,
    sourceTier: normalizeSourceTier(source.source_tier),
    sourceKind: normalizeSourceKind(source.source_kind),
    accessStatus: normalizeAccessStatus(source.access_status),
    title: source.title,
    notes: source.notes,
    checkedAt: source.checked_at,
  }))

  const sourcesByFinding = new Map<string, ContentResearchSource[]>()
  for (const source of sources) {
    if (!source.findingId) continue
    const current = sourcesByFinding.get(source.findingId) ?? []
    current.push(source)
    sourcesByFinding.set(source.findingId, current)
  }

  const findings: ContentResearchFinding[] = findingRows.map((finding) => ({
    id: finding.id,
    runId: finding.run_id,
    contentType: normalizeContentResearchType(finding.content_type),
    decision: normalizeFindingDecision(finding.decision),
    title: finding.title,
    creator: finding.creator,
    contentId: finding.content_id,
    evidenceSummary: finding.evidence_summary,
    rejectionReason: finding.rejection_reason,
    createdAt: finding.created_at,
    sources: sourcesByFinding.get(finding.id) ?? [],
  }))

  const runs: ContentResearchRun[] = runRows.map((run) => {
    const scopes: ContentResearchScope[] = scopeRows
      .filter((scope) => scope.run_id === run.id)
      .map((scope) => {
        const contentType = normalizeContentResearchType(scope.content_type)
        return {
          runId: run.id,
          contentType,
          status: normalizeScopeStatus(scope.status),
          searchNotes: scope.search_notes,
          completedAt: scope.completed_at,
          findings: findings.filter(
            (finding) =>
              finding.runId === run.id && finding.contentType === contentType
          ),
          sources: sources.filter(
            (source) => source.runId === run.id && source.contentType === contentType
          ),
        }
      })
      .sort(
        (left, right) =>
          CONTENT_RESEARCH_TYPES.indexOf(left.contentType) -
          CONTENT_RESEARCH_TYPES.indexOf(right.contentType)
      )

    return {
      id: run.id,
      celebId: run.celeb_id,
      batchKey: run.batch_key,
      status: normalizeRunStatus(run.status),
      researcherId: run.researcher_id,
      researcherLabel: run.researcher_label,
      nameVariants: run.name_variants,
      homonymNotes: run.homonym_notes,
      summary: run.summary,
      startedAt: run.started_at,
      completedAt: run.completed_at,
      scopes,
    }
  })

  return {
    profile: {
      id: profile.id,
      slug: profile.slug,
      nickname: profile.nickname ?? '이름 없음',
      nicknameEn: profile.nickname_en,
      profession: profile.profession,
      profileStatus: profile.status ?? 'inactive',
      celebTier: profile.celeb_tier,
      actualContentCount: contentCountResult.count ?? 0,
      researchStatus: normalizeResearchStatus(profile.content_research_status),
    },
    runs,
  }
}

export async function startContentResearchRun(
  input: StartContentResearchRunInput
): Promise<{ runId: string }> {
  const adminUser = await assertAdmin()
  const admin = createAdminClient()
  const nameVariants = normalizeNameVariants(input.nameVariants)

  if (nameVariants.length === 0) {
    throw new Error('조사에 사용한 인물명·표기 변형을 하나 이상 입력하세요.')
  }

  const { data, error } = await admin
    .from('celeb_content_research_runs')
    .insert({
      celeb_id: input.celebId,
      batch_key: requireText(input.batchKey, '배치 키'),
      researcher_id: adminUser.id,
      researcher_label: requireText(input.researcherLabel, '조사자'),
      name_variants: nameVariants,
      homonym_notes: optionalText(input.homonymNotes),
    })
    .select('id')
    .single()

  if (error || !data) throw error ?? new Error('조사 실행을 만들지 못했습니다.')

  revalidateResearchWorkspace(input.celebId)
  return { runId: data.id }
}

export async function updateContentResearchRun(
  runId: string,
  input: {
    researcherLabel: string
    nameVariants: string[]
    homonymNotes?: string | null
    summary?: string | null
  }
): Promise<void> {
  await assertAdmin()
  const admin = createAdminClient()
  const celebId = await getRunCelebId(admin, runId)
  const nameVariants = normalizeNameVariants(input.nameVariants)

  if (nameVariants.length === 0) {
    throw new Error('조사에 사용한 인물명·표기 변형을 하나 이상 입력하세요.')
  }

  const { data, error } = await admin
    .from('celeb_content_research_runs')
    .update({
      researcher_label: requireText(input.researcherLabel, '조사자'),
      name_variants: nameVariants,
      homonym_notes: optionalText(input.homonymNotes),
      summary: optionalText(input.summary),
    })
    .eq('id', runId)
    .eq('status', 'in_progress')
    .select('id')
    .maybeSingle()

  if (error) throw error
  if (!data) throw new Error('진행 중인 조사 실행을 찾을 수 없습니다.')
  revalidateResearchWorkspace(celebId)
}

export async function updateContentResearchScope(
  input: UpdateContentResearchScopeInput
): Promise<void> {
  await assertAdmin()
  const admin = createAdminClient()
  const contentType = normalizeContentResearchType(input.contentType)
  const status = normalizeScopeStatus(input.status)
  const celebId = await getRunCelebId(admin, input.runId)

  const { data, error } = await admin
    .from('celeb_content_research_scopes')
    .update({
      status,
      search_notes: optionalText(input.searchNotes),
      completed_at: status === 'completed' ? new Date().toISOString() : null,
    })
    .eq('run_id', input.runId)
    .eq('content_type', contentType)
    .select('run_id')
    .maybeSingle()

  if (error) throw error
  if (!data) throw new Error('변경할 유형 조사 범위를 찾을 수 없습니다.')
  revalidateResearchWorkspace(celebId)
}

export async function saveContentResearchFinding(
  input: SaveContentResearchFindingInput
): Promise<void> {
  await assertAdmin()
  const admin = createAdminClient()
  const contentType = normalizeContentResearchType(input.contentType)
  const decision = normalizeFindingDecision(input.decision)
  const celebId = await getRunCelebId(admin, input.runId)
  const contentId = optionalText(input.contentId)
  const evidenceSummary = optionalText(input.evidenceSummary)
  const rejectionReason = optionalText(input.rejectionReason)

  if (decision === 'accepted' && !contentId) {
    throw new Error('채택 작품은 먼저 콘텐츠 메타와 연결 ID를 확정해야 합니다.')
  }
  if (decision !== 'candidate' && !evidenceSummary) {
    throw new Error('채택·기각 판정에는 근거 요약이 필요합니다.')
  }
  if (decision === 'rejected' && !rejectionReason) {
    throw new Error('기각 판정에는 기각 사유가 필요합니다.')
  }

  const payload = {
    run_id: input.runId,
    content_type: contentType,
    decision,
    title: requireText(input.title, '작품명'),
    creator: optionalText(input.creator),
    content_id: decision === 'accepted' ? contentId : null,
    evidence_summary: decision === 'candidate' ? null : evidenceSummary,
    rejection_reason: decision === 'rejected' ? rejectionReason : null,
  }

  const query = input.id
    ? admin
        .from('celeb_content_research_findings')
        .update(payload)
        .eq('id', input.id)
        .eq('run_id', input.runId)
    : admin.from('celeb_content_research_findings').insert(payload)

  const { data, error } = await query.select('id').maybeSingle()
  if (error) throw error
  if (!data) throw new Error('저장할 조사 후보를 찾지 못했습니다.')
  revalidateResearchWorkspace(celebId)
}

export async function deleteContentResearchFinding(
  runId: string,
  findingId: string
): Promise<void> {
  await assertAdmin()
  const admin = createAdminClient()
  const celebId = await getRunCelebId(admin, runId)
  const { data, error } = await admin
    .from('celeb_content_research_findings')
    .delete()
    .eq('id', findingId)
    .eq('run_id', runId)
    .select('id')
    .maybeSingle()

  if (error) throw error
  if (!data) throw new Error('삭제할 조사 후보를 찾지 못했습니다.')
  revalidateResearchWorkspace(celebId)
}

export async function saveContentResearchSource(
  input: SaveContentResearchSourceInput
): Promise<void> {
  await assertAdmin()
  const admin = createAdminClient()
  const contentType = normalizeContentResearchType(input.contentType)
  const sourceTier = normalizeSourceTier(input.sourceTier)
  const sourceKind = normalizeSourceKind(input.sourceKind)
  const accessStatus = normalizeAccessStatus(input.accessStatus)
  const celebId = await getRunCelebId(admin, input.runId)
  const url = requireText(input.url, '출처 URL')

  try {
    const parsedUrl = new URL(url)
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      throw new Error('HTTP(S) URL만 저장할 수 있습니다.')
    }
  } catch {
    throw new Error('유효한 HTTP(S) 출처 URL을 입력하세요.')
  }

  const payload = {
    run_id: input.runId,
    content_type: contentType,
    finding_id: input.findingId || null,
    url,
    source_tier: sourceTier,
    source_kind: sourceKind,
    access_status: accessStatus,
    title: optionalText(input.title),
    notes: optionalText(input.notes),
    checked_at: new Date().toISOString(),
  }

  const query = input.id
    ? admin
        .from('celeb_content_research_sources')
        .update(payload)
        .eq('id', input.id)
        .eq('run_id', input.runId)
    : admin.from('celeb_content_research_sources').insert(payload)

  const { data, error } = await query.select('id').maybeSingle()
  if (error) throw error
  if (!data) throw new Error('저장할 조사 출처를 찾지 못했습니다.')
  revalidateResearchWorkspace(celebId)
}

export async function deleteContentResearchSource(
  runId: string,
  sourceId: string
): Promise<void> {
  await assertAdmin()
  const admin = createAdminClient()
  const celebId = await getRunCelebId(admin, runId)
  const { data, error } = await admin
    .from('celeb_content_research_sources')
    .delete()
    .eq('id', sourceId)
    .eq('run_id', runId)
    .select('id')
    .maybeSingle()

  if (error) throw error
  if (!data) throw new Error('삭제할 조사 출처를 찾지 못했습니다.')
  revalidateResearchWorkspace(celebId)
}

export async function cancelContentResearchRun(runId: string): Promise<void> {
  await assertAdmin()
  const admin = createAdminClient()
  const celebId = await getRunCelebId(admin, runId)

  const { data, error } = await admin.rpc('cancel_celeb_content_research_run', {
    target_run_id: runId,
  })

  if (error) throw error
  if (data !== celebId) throw new Error('조사 취소 결과가 대상 인물과 일치하지 않습니다.')
  revalidateResearchWorkspace(celebId)
}

export async function completeContentResearchRun(
  runId: string
): Promise<{ researchStatus: string; actualContentCount: number }> {
  await assertAdmin()
  const admin = createAdminClient()
  const celebId = await getRunCelebId(admin, runId)
  const { data, error } = await admin.rpc('complete_celeb_content_research_run', {
    target_run_id: runId,
  })

  if (error) throw error
  const result = Array.isArray(data) ? data[0] : data
  if (!result) throw new Error('조사 완료 결과를 받지 못했습니다.')

  revalidateResearchWorkspace(celebId)
  revalidatePath('/celebs')
  revalidatePath('/celebs/[slug]', 'page')
  await revalidateWebCache(CACHE_TAGS.CELEBS)

  return {
    researchStatus: result.final_research_status,
    actualContentCount: Number(result.actual_content_count),
  }
}
