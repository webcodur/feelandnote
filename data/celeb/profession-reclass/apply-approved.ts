import fs from 'node:fs'
import path from 'node:path'
import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { revalidateWebItems } from '../../../sw/web-bo/src/lib/revalidate-web'

config({ path: path.resolve(process.cwd(), '.env'), quiet: true })

const FILES = [
  'active-fiction-a.json',
  'active-fiction-b.json',
  'active-fiction-c.json',
  'inactive-fiction-a.json',
  'inactive-fiction-b.json',
  'nonfiction.json',
] as const

const PROFESSIONS = new Set([
  'leader', 'politician', 'commander', 'entrepreneur', 'investor',
  'humanities_scholar', 'social_scientist', 'scientist', 'director',
  'musician', 'visual_artist', 'author', 'actor', 'influencer', 'athlete',
])

type Proposal = {
  slug: string
  profession: string
  confidence: 'high' | 'low'
  alternatives: string[]
  reason: string
}

type CelebRow = {
  id: string
  slug: string
  profession: string | null
  publication_status: string | null
  celeb_tier: string | null
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) throw new Error('Supabase environment variables are missing.')
const db = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })

const folder = path.resolve(process.cwd(), '../../data/celeb/profession-reclass')
const proposals = FILES.flatMap((file) => JSON.parse(
  fs.readFileSync(path.join(folder, file), 'utf8'),
) as Proposal[])

function chunks<T>(values: T[], size: number): T[][] {
  const result: T[][] = []
  for (let index = 0; index < values.length; index += size) result.push(values.slice(index, index + size))
  return result
}

async function rowsBySlugs(slugs: string[]): Promise<CelebRow[]> {
  const result: CelebRow[] = []
  for (const part of chunks(slugs, 40)) {
    const { data, error } = await db
      .from('celebs')
      .select('id,slug,profession,publication_status,celeb_tier')
      .in('slug', part)
    if (error) throw new Error(`Failed to query targets: ${error.message}`)
    result.push(...((data ?? []) as CelebRow[]))
  }
  return result
}

async function allOtherRows(): Promise<CelebRow[]> {
  const result: CelebRow[] = []
  const pageSize = 1000
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await db
      .from('celebs')
      .select('id,slug,profession,publication_status,celeb_tier')
      .eq('profession', 'other')
      .order('slug')
      .range(from, from + pageSize - 1)
    if (error) throw new Error(`Failed to query all other rows: ${error.message}`)
    const page = (data ?? []) as CelebRow[]
    result.push(...page)
    if (page.length < pageSize) return result
  }
}

function setDifference(left: Set<string>, right: Set<string>): string[] {
  return [...left].filter((value) => !right.has(value)).sort()
}

function assertSameSlugSet(actualRows: CelebRow[], expectedSlugs: string[], label: string) {
  const actual = new Set(actualRows.map((row) => row.slug))
  const expected = new Set(expectedSlugs)
  const unexpected = setDifference(actual, expected)
  const missing = setDifference(expected, actual)
  if (actual.size !== actualRows.length || unexpected.length || missing.length) {
    throw new Error(
      `${label}: unexpected=[${unexpected.join(', ')}], missing=[${missing.join(', ')}]`,
    )
  }
}

async function rollback(ids: string[]) {
  for (const part of chunks(ids, 40)) {
    const { error } = await db.from('celebs').update({ profession: 'other' }).in('id', part)
    if (error) throw new Error(`Rollback failed: ${error.message}`)
  }
}

async function main() {
  if (proposals.length !== 389) throw new Error(`Proposal count ${proposals.length} != 389`)
  const proposalSlugs = new Set(proposals.map((row) => row.slug))
  if (proposalSlugs.size !== proposals.length) throw new Error('Proposal slugs are duplicated.')
  for (const proposal of proposals) {
    if (!PROFESSIONS.has(proposal.profession)) {
      throw new Error(`${proposal.slug}: invalid profession ${proposal.profession}`)
    }
    if (proposal.confidence !== 'high' && proposal.confidence !== 'low') {
      throw new Error(`${proposal.slug}: invalid confidence ${proposal.confidence}`)
    }
    if (!Array.isArray(proposal.alternatives)
      || proposal.alternatives.some((profession) => !PROFESSIONS.has(profession))) {
      throw new Error(`${proposal.slug}: invalid alternatives`)
    }
    if (proposal.confidence === 'high' && proposal.alternatives.length) {
      throw new Error(`${proposal.slug}: high-confidence proposal still has alternatives`)
    }
  }

  const current = await rowsBySlugs(proposals.map((row) => row.slug))
  if (current.length !== proposals.length) throw new Error(`DB target count ${current.length} != 389`)
  const currentBySlug = new Map(current.map((row) => [row.slug, row]))

  const conflicts: string[] = []
  for (const proposal of proposals) {
    const row = currentBySlug.get(proposal.slug)
    if (!row) {
      conflicts.push(`${proposal.slug}:missing`)
      continue
    }
    if (proposal.confidence === 'high') {
      if (row.profession !== 'other' && row.profession !== proposal.profession) {
        conflicts.push(`${proposal.slug}:${row.profession}->${proposal.profession}`)
      }
    } else if (row.profession !== 'other') {
      conflicts.push(`${proposal.slug}:low-but-${row.profession}`)
    }
  }
  if (conflicts.length) throw new Error(`Current DB conflicts with proposals: ${conflicts.join(', ')}`)

  const currentOtherSlugs = proposals
    .filter((proposal) => currentBySlug.get(proposal.slug)?.profession === 'other')
    .map((proposal) => proposal.slug)
  assertSameSlugSet(await allOtherRows(), currentOtherSlugs, 'Preflight global other set mismatch')

  const targets = proposals
    .filter((proposal) => proposal.confidence === 'high')
    .map((proposal) => ({ proposal, row: currentBySlug.get(proposal.slug)! }))
    .filter(({ row }) => row.profession === 'other')
  const unresolved = proposals.filter((proposal) => proposal.confidence === 'low')
  if (targets.length !== 124) throw new Error(`Newly resolved count ${targets.length} != 124`)
  if (unresolved.length !== 89) throw new Error(`Unresolved count ${unresolved.length} != 89`)

  const summary = {
    mode: process.argv.includes('--apply') ? 'apply' : 'dry-run',
    targets: targets.length,
    activeTargets: targets.filter(({ row }) => row.publication_status === 'active').length,
    unresolved: unresolved.length,
    byProfession: Object.fromEntries(
      [...PROFESSIONS].sort().flatMap((profession) => {
        const count = targets.filter(({ proposal }) => proposal.profession === profession).length
        return count ? [[profession, count]] : []
      }),
    ),
  }

  if (!process.argv.includes('--apply')) {
    console.log(JSON.stringify(summary, null, 2))
    return
  }

  const updatedIds: string[] = []
  try {
    for (const profession of [...PROFESSIONS].sort()) {
      const professionTargets = targets.filter(({ proposal }) => proposal.profession === profession)
      for (const part of chunks(professionTargets, 40)) {
        const ids = part.map(({ row }) => row.id)
        const { data, error } = await db
          .from('celebs')
          .update({ profession })
          .in('id', ids)
          .eq('profession', 'other')
          .select('id')
        if (error) throw new Error(`${profession} update failed: ${error.message}`)
        updatedIds.push(...((data ?? []) as Array<{ id: string }>).map((row) => row.id))
        if ((data ?? []).length !== ids.length) {
          throw new Error(`${profession} updated ${(data ?? []).length} != ${ids.length}`)
        }
      }
    }
  } catch (error) {
    await rollback(updatedIds)
    throw error
  }

  const verified = await rowsBySlugs(proposals.map((row) => row.slug))
  const verifiedBySlug = new Map(verified.map((row) => [row.slug, row]))
  const mismatches = proposals.filter((proposal) => {
    const expected = proposal.confidence === 'high' ? proposal.profession : 'other'
    return verifiedBySlug.get(proposal.slug)?.profession !== expected
  })
  if (mismatches.length) {
    await rollback(updatedIds)
    throw new Error(`Post-update target verification failed: ${mismatches.map((row) => row.slug).join(', ')}`)
  }

  try {
    assertSameSlugSet(
      await allOtherRows(),
      unresolved.map((proposal) => proposal.slug),
      'Post-update global other set mismatch',
    )
  } catch (error) {
    await rollback(updatedIds)
    throw error
  }

  const activeTargets = targets.filter(({ row }) => row.publication_status === 'active')
  await revalidateWebItems(
    activeTargets.flatMap(({ row }) => [
      { domain: CACHE_TAGS.CELEBS, id: row.id },
      { domain: CACHE_TAGS.CELEBS, id: row.slug },
    ]),
    [CACHE_TAGS.CELEBS],
  )

  console.log(JSON.stringify({
    ...summary,
    updated: updatedIds.length,
    remainingOther: unresolved.length,
    cache: 'revalidated',
  }, null, 2))
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
