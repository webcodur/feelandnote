/**
 * 이름·bio만 준비된 신화·전설 인물을 fiction/inactive로 선등록한다.
 *
 * 명세 형식:
 * {
 *   "tag_slug": "myth-korea",
 *   "people": [
 *     {
 *       "nickname": "바리공주",
 *       "nickname_en": "Princess Bari",
 *       "bio": "한국 무속 신화에서 저승을 다녀와 부모를 살리는 인간 영웅.",
 *       "identity": { "mode": "new" }
 *     }
 *   ]
 * }
 *
 * 기본은 dry-run이다. --apply를 붙여야 DB를 바꾼다.
 * 신화 소속은 hidden=true인 웹 전용 배정으로 보존하므로 후보가 세력도감에 노출되지 않는다.
 *
 * 실행:
 *   pnpm faction:seed:inactive --file <명세.json>
 *   pnpm faction:seed:inactive --file <명세.json> --apply
 */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient, type SupabaseClient as DatabaseClient } from '@supabase/supabase-js'
import { assertRouteSafeCelebSlug, previewGeneratedCelebSlug } from '../../src/lib/celeb-slug'
import {
  type InactiveFictionSeedPerson,
  parseInactiveFictionSeedManifest,
  reserveGeneratedSlug,
} from './seed-inactive-contract'

type ExistingProfile = {
  id: string
  slug: string | null
  nickname: string | null
  nickname_en: string | null
  bio: string | null
  celeb_tier: string | null
  celeb_reality: string | null
  publication_status: string | null
}

type TagRow = {
  id: string
  slug: string
  name: string
  is_fiction: boolean
}

type AtlasMemberRow = {
  celeb_id: string
  source: 'production' | 'manual'
  hidden: boolean
}

type AssignmentRow = {
  celeb_id: string
  sort_order: number
  hidden: boolean
}

type PlannedSeed = {
  kind: 'create' | 'link' | 'skip'
  person: InactiveFictionSeedPerson
  existing: ExistingProfile | null
  celebId: string
  slug: string
  slugSuffix: string | null
  reason: string
}

const argValue = (name: string): string | null => {
  const index = process.argv.indexOf(name)
  return index >= 0 ? process.argv[index + 1] ?? null : null
}

const normalizedIdentity = (value: string | null) => (
  value?.normalize('NFKC').trim().toLocaleLowerCase() ?? ''
)

async function allRows<T>(
  client: DatabaseClient,
  table: string,
  select: string,
): Promise<T[]> {
  const rows: T[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await client
      .from(table)
      .select(select)
      .order('id')
      .range(from, from + 999)
    if (error) throw error
    rows.push(...((data ?? []) as unknown as T[]))
    if (!data || data.length < 1000) return rows
  }
}

async function cleanupFailedBatch(
  client: DatabaseClient,
  createdCelebIds: string[],
  createdAssignmentIds: string[],
  cause: unknown,
): Promise<never> {
  const cleanupErrors: unknown[] = []
  if (createdAssignmentIds.length > 0) {
    const { error } = await client
      .from('celeb_tag_assignments')
      .delete()
      .in('id', createdAssignmentIds)
    if (error) cleanupErrors.push(error)
  }
  if (createdCelebIds.length > 0) {
    const { error } = await client.from('celebs').delete().in('id', createdCelebIds)
    if (error) cleanupErrors.push(error)
  }
  if (cleanupErrors.length > 0) {
    throw new AggregateError(
      [cause, ...cleanupErrors],
      '선등록 배치 실패 뒤 이번 실행의 데이터 정리도 실패했습니다.',
    )
  }
  throw cause
}

async function verifyApplied(
  client: DatabaseClient,
  tagId: string,
  applied: PlannedSeed[],
) {
  if (applied.length === 0) return
  const celebIds = applied.map((plan) => plan.celebId)
  const createdCelebIds = applied
    .filter((plan) => plan.kind === 'create')
    .map((plan) => plan.celebId)
  const [profilesResult, assignmentsResult, metricsResult] = await Promise.all([
    client
      .from('celebs')
      .select('id,nickname,nickname_en,bio,celeb_tier,celeb_reality,publication_status')
      .in('id', celebIds),
    client
      .from('celeb_tag_assignments')
      .select('celeb_id,hidden')
      .eq('tag_id', tagId)
      .in('celeb_id', celebIds),
    createdCelebIds.length > 0
      ? client.from('celeb_metrics').select('celeb_id').in('celeb_id', createdCelebIds)
      : Promise.resolve({ data: [], error: null }),
  ])
  if (profilesResult.error) throw profilesResult.error
  if (assignmentsResult.error) throw assignmentsResult.error
  if (metricsResult.error) throw metricsResult.error

  const profilesById = new Map((profilesResult.data ?? []).map((row) => [row.id, row]))
  const assignmentsByCelebId = new Map(
    (assignmentsResult.data ?? []).map((row) => [row.celeb_id, row]),
  )
  const metricCelebIds = new Set((metricsResult.data ?? []).map((row) => row.celeb_id))
  for (const plan of applied) {
    const profile = profilesById.get(plan.celebId)
    const assignment = assignmentsByCelebId.get(plan.celebId)
    if (!profile || !assignment) {
      throw new Error(`${plan.slug}: 선등록 readback 행을 찾지 못했습니다.`)
    }
    const profileMismatch = plan.kind === 'create'
      ? profile.nickname !== plan.person.nickname
        || profile.nickname_en !== plan.person.nickname_en
        || profile.bio !== plan.person.bio
        || profile.celeb_reality !== 'FICTION'
        || profile.publication_status !== 'inactive'
      : profile.celeb_reality !== 'FICTION'
    const metricsMissing = plan.kind === 'create' && !metricCelebIds.has(plan.celebId)
    if (profileMismatch || assignment.hidden !== true || metricsMissing) {
      throw new Error(`${plan.slug}: 선등록 readback이 계획과 다릅니다.`)
    }
  }
}

async function main() {
  const file = argValue('--file')
  if (!file) throw new Error('--file <명세.json>이 필요합니다.')
  if (!process.env.NEXT_PUBLIC_DB_API_URL || !process.env.DB_SECRET_KEY) {
    throw new Error('NEXT_PUBLIC_DB_API_URL과 DB_SECRET_KEY가 필요합니다.')
  }

  const manifest = parseInactiveFictionSeedManifest(
    JSON.parse(readFileSync(resolve(process.cwd(), file), 'utf8')) as unknown,
  )
  const apply = process.argv.includes('--apply')
  const client = createClient(
    process.env.NEXT_PUBLIC_DB_API_URL,
    process.env.DB_SECRET_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )

  const { data: tagData, error: tagError } = await client
    .from('celeb_tags')
    .select('id,slug,name,is_fiction')
    .eq('slug', manifest.tag_slug)
    .maybeSingle()
  if (tagError) throw tagError
  if (!tagData) throw new Error(`fiction 태그를 찾을 수 없습니다: ${manifest.tag_slug}`)
  const tag = tagData as TagRow
  if (!tag.is_fiction) throw new Error(`${tag.slug}: is_fiction=true인 태그가 아닙니다.`)

  const [profiles, atlasMembers, assignments] = await Promise.all([
    allRows<ExistingProfile>(
      client,
      'celebs',
      'id,slug,nickname,nickname_en,bio,celeb_tier,celeb_reality,publication_status',
    ),
    client
      .from('faction_atlas_members')
      .select('celeb_id,source,hidden')
      .eq('tag_id', tag.id),
    client
      .from('celeb_tag_assignments')
      .select('celeb_id,sort_order,hidden')
      .eq('tag_id', tag.id),
  ])
  if (atlasMembers.error) throw atlasMembers.error
  if (assignments.error) throw assignments.error

  const profileById = new Map(profiles.map((row) => [row.id, row]))
  const atlasByCeleb = new Map(
    ((atlasMembers.data ?? []) as AtlasMemberRow[]).map((row) => [row.celeb_id, row]),
  )
  const occupiedSlugs = new Set(profiles.flatMap((row) => row.slug ? [row.slug] : []))

  const plans: PlannedSeed[] = manifest.people.map((person) => {
    if (person.identity.mode === 'existing') {
      const existing = profileById.get(person.identity.celeb_id)
      if (!existing) {
        throw new Error(`${person.nickname}: 지정한 기존 프로필을 찾을 수 없습니다 (${person.identity.celeb_id}).`)
      }
      if (
        normalizedIdentity(existing.nickname) !== normalizedIdentity(person.nickname)
        || normalizedIdentity(existing.nickname_en) !== normalizedIdentity(person.nickname_en)
      ) {
        throw new Error(`${person.nickname}: 기존 프로필과 한영 이름이 일치하지 않습니다.`)
      }
      if (existing.celeb_reality === 'REAL') {
        throw new Error(`${person.nickname}: 기존 인물의 티어가 fiction이 아닙니다.`)
      }
      if (existing.publication_status === 'deleted') {
        throw new Error(`${person.nickname}: 삭제된 기존 fiction 프로필입니다.`)
      }
      const atlas = atlasByCeleb.get(existing.id)
      return {
        kind: atlas ? 'skip' : 'link',
        person,
        existing,
        celebId: existing.id,
        slug: existing.slug ?? '(slug 없음)',
        slugSuffix: null,
        reason: atlas
          ? `이미 ${atlas.source} 소속이 있습니다${atlas.hidden ? ' (숨김)' : ''}.`
          : '기존 fiction 프로필에 숨김 소속만 추가합니다.',
      }
    }

    const baseSlug = assertRouteSafeCelebSlug(previewGeneratedCelebSlug(person.nickname_en))
    if (!baseSlug) throw new Error(`${person.nickname_en}: generated slug를 만들 수 없습니다.`)
    const reserved = reserveGeneratedSlug(baseSlug, occupiedSlugs)
    const sameNameProfiles = profiles.filter((profile) => (
      normalizedIdentity(profile.nickname) === normalizedIdentity(person.nickname)
      || normalizedIdentity(profile.nickname_en) === normalizedIdentity(person.nickname_en)
    ))
    return {
      kind: 'create',
      person,
      existing: null,
      celebId: crypto.randomUUID(),
      slug: reserved.slug,
      slugSuffix: reserved.slugSuffix,
      reason: sameNameProfiles.length > 0
        ? `명시적 신규 인물입니다. 이름 일치 기존 후보 ${sameNameProfiles.map((row) => `${row.slug ?? row.id} (${row.bio ?? 'bio 없음'})`).join(', ')}와 분리합니다.`
        : 'fiction/inactive 프로필과 숨김 소속을 만듭니다.',
    }
  })

  for (const plan of plans) {
    console.log(`[${plan.kind.toUpperCase()}] ${plan.slug} · ${plan.person.nickname} — ${plan.reason}`)
  }
  console.log(JSON.stringify({
    mode: apply ? 'APPLY' : 'DRY-RUN',
    tag: { slug: tag.slug, name: tag.name },
    totals: {
      create: plans.filter((plan) => plan.kind === 'create').length,
      link: plans.filter((plan) => plan.kind === 'link').length,
      skip: plans.filter((plan) => plan.kind === 'skip').length,
    },
  }, null, 2))
  if (!apply) return

  let nextSortOrder = Math.max(
    -1,
    ...((assignments.data ?? []) as AssignmentRow[]).map((row) => row.sort_order),
  ) + 1
  const applied = plans.filter((plan) => plan.kind !== 'skip')
  const created = applied.filter((plan) => plan.kind === 'create')
  const createdCelebIds = created.map((plan) => plan.celebId)

  if (created.length > 0) {
    const { data, error } = await client
      .from('celebs')
      .insert(created.map((plan) => ({
        id: plan.celebId,
        nickname: plan.person.nickname,
        nickname_en: plan.person.nickname_en,
        slug_suffix: plan.slugSuffix,
        bio: plan.person.bio,
        celeb_tier: 'light',
        celeb_reality: 'FICTION',
        publication_status: 'inactive',
        is_verified: false,
      })))
      .select('id,slug')
    if (error) throw error
    const returnedSlugs = new Map((data ?? []).map((row) => [row.id, row.slug]))
    const mismatchedPlan = created.find((plan) => returnedSlugs.get(plan.celebId) !== plan.slug)
    if (mismatchedPlan) {
      await cleanupFailedBatch(
        client,
        createdCelebIds,
        [],
        new Error(
          `${mismatchedPlan.person.nickname}: 생성 slug ${returnedSlugs.get(mismatchedPlan.celebId)}가 계획 ${mismatchedPlan.slug}와 다릅니다.`,
        ),
      )
    }
  }

  const assignmentRows = applied.map((plan) => ({
    celeb_id: plan.celebId,
    tag_id: tag.id,
    sort_order: nextSortOrder++,
    hidden: true,
  }))
  const assignmentResult = assignmentRows.length > 0
    ? await client.from('celeb_tag_assignments').insert(assignmentRows).select('id,celeb_id')
    : { data: [], error: null }
  if (assignmentResult.error) {
    await cleanupFailedBatch(client, createdCelebIds, [], assignmentResult.error)
  }
  const createdAssignmentIds = (assignmentResult.data ?? []).map((row) => row.id)
  try {
    await verifyApplied(client, tag.id, applied)
  } catch (error) {
    await cleanupFailedBatch(client, createdCelebIds, createdAssignmentIds, error)
  }
  console.log(`READBACK OK: ${applied.length}명`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
