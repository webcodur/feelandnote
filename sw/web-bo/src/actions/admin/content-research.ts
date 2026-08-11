'use server'

import { revalidatePath } from 'next/cache'
import {
  CELEB_CONTENT_RESEARCH_TARGET_PROFILE_STATUSES,
  CELEB_CONTENT_RESEARCH_TARGET_TIERS,
  resolveCelebContentCount,
} from '@feelandnote/shared/constants/celeb-content-research'
import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { revalidateWebItems } from '@/lib/revalidate-web'
import {
  type ContentResearchBucket,
  type ContentResearchRow,
  type ContentResearchWorkspace,
  type GetContentResearchParams,
} from './content-research-types'

type CelebRow = {
  id: string
  slug: string | null
  nickname: string | null
  avatar_url: string | null
  profession: string | null
  birth_date: string | null
  death_date: string | null
  status: string | null
  content_research_confirmed_empty_at: string | null
  celeb_influence:
    | { total_score: number | null }
    | { total_score: number | null }[]
    | null
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

function getBirthYear(value: string | null): number | null {
  if (!value) return null
  const match = value.match(/-?\d{1,4}/)
  if (!match) return null
  const year = Number(match[0])
  return Number.isFinite(year) ? year : null
}

function getTriageSignals(
  profile: CelebRow,
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
  confirmedEmptyAt: string | null
): ContentResearchBucket {
  if (actualContentCount === 0 && confirmedEmptyAt) {
    return 'confirmed_zero'
  }
  if (actualContentCount > 0) return 'promote_audit'

  return profileStatus === 'active' ? 'active_research' : 'inactive_triage'
}

async function getAllLightCelebs(): Promise<CelebRow[]> {
  const admin = createAdminClient()
  const rows: CelebRow[] = []

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await admin
      .from('celebs')
      .select(`
        id, slug, nickname, avatar_url, profession, birth_date, death_date,
        status:publication_status, content_research_confirmed_empty_at,
        celeb_influence!celeb_influence_celebs_fkey(total_score)
      `)
      // 모집단 조건은 shared 규약이 정한다 — 여기서 값을 하드코딩하지 마라
      .in('celeb_tier', [...CELEB_CONTENT_RESEARCH_TARGET_TIERS])
      .in('publication_status', [...CELEB_CONTENT_RESEARCH_TARGET_PROFILE_STATUSES])
      .order('id', { ascending: true })
      .range(from, from + PAGE_SIZE - 1)

    if (error) throw error
    const batch = (data ?? []) as unknown as CelebRow[]
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
        .from('celeb_contents')
        .select('id, celeb_id')
        .in('celeb_id', ids)
        .order('id', { ascending: true })
        .range(from, from + PAGE_SIZE - 1)

      if (error) throw error
      const batch = data ?? []
      for (const row of batch) {
        counts.set(row.celeb_id, (counts.get(row.celeb_id) ?? 0) + 1)
      }
      if (batch.length < PAGE_SIZE) break
    }
  }

  return counts
}

// 세력도감 연결 여부 — 단일 원천 뷰(faction_atlas_members) 기준. 제작 유래 ∪ 웹 전용 배정.
async function getFactionLinkedIds(celebIds: string[]): Promise<Set<string>> {
  const admin = createAdminClient()
  const linkedIds = new Set<string>()

  for (let chunkStart = 0; chunkStart < celebIds.length; chunkStart += IN_FILTER_CHUNK) {
    const ids = celebIds.slice(chunkStart, chunkStart + IN_FILTER_CHUNK)

    for (let from = 0; ; from += PAGE_SIZE) {
      // 뷰에는 단일 id 가 없어 (tag_id, celeb_id) 짝을 정렬키로 쓴다
      const { data, error } = await admin
        .from('faction_atlas_members')
        .select('tag_id, celeb_id')
        .in('celeb_id', ids)
        .order('tag_id', { ascending: true })
        .order('celeb_id', { ascending: true })
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
    confirmed_zero: 0,
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
  } = params

  const celebs = await getAllLightCelebs()
  const celebIds = celebs.map((profile) => profile.id)
  const [contentCounts, factionLinkedIds] = await Promise.all([
    getContentCounts(celebIds),
    getFactionLinkedIds(celebIds),
  ])

  const allRows = celebs.map((profile): ContentResearchRow => {
    const influence = getSingleRelation(profile.celeb_influence)
    const influenceTotal = influence?.total_score ?? 0
    const factionLinked = factionLinkedIds.has(profile.id)
    const actualContentCount = contentCounts.get(profile.id) ?? 0
    const { score, signals } = getTriageSignals(profile, influenceTotal, factionLinked)
    const profileStatus = profile.status ?? 'inactive'
    const confirmedEmptyAt = profile.content_research_confirmed_empty_at

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
        confirmedEmptyAt
      ),
      confirmedEmptyAt,
      bucket: deriveBucket(
        profileStatus,
        actualContentCount,
        confirmedEmptyAt
      ),
      triageScore: score,
      triageSignals: signals,
    }
  })

  const bucketCounts = emptyBucketCounts()
  for (const row of allRows) {
    bucketCounts[row.bucket] += 1
  }

  const normalizedSearch = search.trim().toLocaleLowerCase('ko')
  const filteredRows = allRows
    .filter((row) => bucket === 'all' || row.bucket === bucket)
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
  }
}

async function assertAdmin(): Promise<{ id: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error('인증이 필요합니다.')

  const { data: isAdmin, error } = await supabase.rpc('is_admin')

  if (error || !isAdmin) {
    throw new Error('관리자 권한이 필요합니다.')
  }

  return { id: user.id }
}

export async function setContentResearchConfirmedEmpty(
  celebId: string,
  confirmed: boolean
): Promise<void> {
  await assertAdmin()

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('celebs')
    .update({
      content_research_confirmed_empty_at: confirmed
        ? new Date().toISOString()
        : null,
    })
    .eq('id', celebId)
    .select('id, slug')
    .maybeSingle()

  if (error) throw error
  if (!data) throw new Error('변경할 셀럽 프로필을 찾을 수 없습니다.')

  revalidatePath('/celebs')
  revalidatePath('/celebs/content-research')
  revalidatePath('/celebs/[slug]', 'page')
  await revalidateWebItems(
    [
      { domain: CACHE_TAGS.CELEBS, id: celebId },
      ...(data.slug ? [{ domain: CACHE_TAGS.CELEBS, id: data.slug }] : []),
    ],
    [CACHE_TAGS.CELEBS],
  )
}
