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
  CONTENT_RESEARCH_BUCKETS,
  type CandidateTitleEvidence,
  type ContentResearchBucket,
  type ContentResearchRow,
  type ContentResearchWorkspace,
  type GetContentResearchParams,
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
  cultural_journey: string | null
  consumption_philosophy: string | null
  content_research_status: string | null
  content_research_updated_at: string | null
  content_research_confirmed_empty_at: string | null
  celeb_influence:
    | { total_score: number | null }
    | { total_score: number | null }[]
    | null
}

const PAGE_SIZE = 1000
const IN_FILTER_CHUNK = 200
const TITLE_PATTERNS = [
  /『([^』\n]{1,120})』/g,
  /《([^》\n]{1,120})》/g,
  /〈([^〉\n]{1,120})〉/g,
  /「([^」\n]{1,120})」/g,
  /\[([^\]\n]{1,120})\]/g,
] as const
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

function getContextBoundary(
  text: string,
  matchStart: number,
  matchEnd: number
): { start: number; end: number } {
  const leftLimit = Math.max(0, matchStart - 140)
  const rightLimit = Math.min(text.length, matchEnd + 180)
  const leftText = text.slice(leftLimit, matchStart)
  const rightText = text.slice(matchEnd, rightLimit)
  const boundaryPattern = /[.!?。！？\n]/

  let start = leftLimit
  for (let index = leftText.length - 1; index >= 0; index -= 1) {
    if (boundaryPattern.test(leftText[index])) {
      start = leftLimit + index + 1
      break
    }
  }

  let end = rightLimit
  const rightBoundary = rightText.search(boundaryPattern)
  if (rightBoundary >= 0) end = matchEnd + rightBoundary + 1

  return { start, end }
}

function extractCandidateTitleEvidence(
  journey: string | null
): CandidateTitleEvidence[] {
  if (!journey) return []

  const evidenceByTitle = new Map<string, CandidateTitleEvidence>()
  for (const pattern of TITLE_PATTERNS) {
    pattern.lastIndex = 0
    for (const match of journey.matchAll(pattern)) {
      const title = match[1]?.trim()
      if (!title || evidenceByTitle.has(title) || match.index === undefined) continue

      const matchEnd = match.index + match[0].length
      const boundary = getContextBoundary(journey, match.index, matchEnd)
      const context = journey
        .slice(boundary.start, boundary.end)
        .replace(/\s+/g, ' ')
        .trim()

      evidenceByTitle.set(title, { title, context })
    }
  }

  return [...evidenceByTitle.values()].slice(0, 12)
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
    signals.push('세력도 연결')
  }

  if (signals.length === 0) signals.push('뚜렷한 선행 신호 없음')
  return { score, signals }
}

function deriveBucket(
  profileStatus: string,
  actualContentCount: number,
  journey: string | null,
  candidateTitles: string[],
  researchStatus: CelebContentResearchStatus
): ContentResearchBucket {
  if (actualContentCount === 0 && researchStatus === 'confirmed_empty') {
    return 'confirmed_empty'
  }
  if (actualContentCount > 0) return 'promote_audit'

  const isActive = profileStatus === 'active'
  if (journey) {
    if (candidateTitles.length > 0) {
      return isActive ? 'active_target' : 'inactive_target'
    }
    return isActive ? 'active_extract' : 'inactive_extract'
  }

  return isActive ? 'active_full' : 'inactive_triage'
}

async function getAllLightProfiles(): Promise<ProfileRow[]> {
  const admin = createAdminClient()
  const rows: ProfileRow[] = []

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await admin
      .from('profiles')
      .select(`
        id, slug, nickname, avatar_url, profession, birth_date, death_date,
        status, cultural_journey, consumption_philosophy,
        content_research_status, content_research_updated_at,
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
    active_target: 0,
    active_extract: 0,
    active_full: 0,
    inactive_target: 0,
    inactive_extract: 0,
    inactive_triage: 0,
    confirmed_empty: 0,
  }
}

function emptyStatusCounts(): Record<CelebContentResearchStatus, number> {
  return {
    open: 0,
    queued: 0,
    researching: 0,
    deferred: 0,
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
    const journey =
      profile.consumption_philosophy?.trim() ||
      profile.cultural_journey?.trim() ||
      null
    const candidateTitleEvidence = extractCandidateTitleEvidence(journey)
    const candidateTitles = candidateTitleEvidence.map((evidence) => evidence.title)
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
      journey,
      candidateTitles,
      candidateTitleEvidence,
      actualContentCount,
      displayContentCount: resolveCelebContentCount(
        actualContentCount,
        normalizedResearchStatus
      ),
      researchStatus: normalizedResearchStatus,
      researchUpdatedAt: profile.content_research_updated_at,
      confirmedEmptyAt: profile.content_research_confirmed_empty_at,
      bucket: deriveBucket(
        profileStatus,
        actualContentCount,
        journey,
        candidateTitles,
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
        row.slug?.toLocaleLowerCase('en').includes(normalizedSearch) ||
        row.candidateTitles.some((title) =>
          title.toLocaleLowerCase('ko').includes(normalizedSearch)
        )
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

async function assertAdmin(): Promise<void> {
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
}

export async function updateContentResearchStatus(
  celebId: string,
  nextStatus: CelebContentResearchStatus
): Promise<void> {
  await assertAdmin()

  if (!CELEB_CONTENT_RESEARCH_STATUSES.includes(nextStatus)) {
    throw new Error('유효하지 않은 조사 상태입니다.')
  }

  const admin = createAdminClient()

  if (nextStatus === 'confirmed_empty') {
    const { count, error: countError } = await admin
      .from('user_contents')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', celebId)

    if (countError) throw countError
    if ((count ?? 0) > 0) {
      throw new Error('등록된 콘텐츠가 있어 없음 확정으로 바꿀 수 없습니다.')
    }
  }

  const { error } = await admin
    .from('profiles')
    .update({ content_research_status: nextStatus })
    .eq('id', celebId)
    .eq('profile_type', 'CELEB')

  if (error) throw error

  revalidatePath('/celebs')
  revalidatePath('/celebs/content-research')
  revalidatePath('/celebs/[slug]', 'page')
  await revalidateWebCache(CACHE_TAGS.CELEBS)
}
