/**
 * 검수를 마친 인물별 도서 선정을 작품별 증분 관계로 반영한다.
 * 기본은 dry-run이며, 기존 관계를 삭제하지 않고 appearance를 related로 낮추지 않는다.
 *
 * pnpm figure-books:apply-reviewed -- --candidates <후보.json> --reviews <최종검수.json>
 * 분할 검수 파일은 --reviews를 반복한다. 끝에 --apply를 붙일 때만 반영한다.
 */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import {
  CACHE_TAGS,
  type CacheItemTarget,
} from '@feelandnote/shared/constants/cache-tags'
import { revalidateWebItems } from '../../src/lib/revalidate-web'
import {
  assertExactFigureBookReadback,
  buildFigureBookBatchPlan,
  type FigureBookCharacterRow,
  type FigureBookRelationType,
  type ResolvedFigureBookCharacter,
} from './source-batch-contract'

type Candidate = {
  person: { id: string; slug: string }
  book: {
    contentId: string
    title: string | null
    isbn: string | null
    verified: boolean | null
    sourcePrimary: string | null
  }
}

type ReviewSelection = {
  contentId: string
  relationType: FigureBookRelationType
  description: string | null
  rationale: string
}

type Review = {
  slug: string
  selections: ReviewSelection[]
}

const dbUrl = process.env.NEXT_PUBLIC_DB_API_URL
const dbKey = process.env.DB_SECRET_KEY
if (!dbUrl || !dbKey) throw new Error('NEXT_PUBLIC_DB_API_URL / DB_SECRET_KEY가 필요합니다.')
const db = createClient(dbUrl, dbKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

function argumentValue(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`)
  if (index >= 0) return process.argv[index + 1]
  const inline = process.argv.find((argument) => argument.startsWith(`--${name}=`))
  return inline?.slice(name.length + 3)
}

function argumentValues(name: string): string[] {
  const results: string[] = []
  for (let index = 0; index < process.argv.length; index += 1) {
    const argument = process.argv[index]
    if (argument === `--${name}` && process.argv[index + 1]) {
      results.push(process.argv[index + 1])
      index += 1
      continue
    }
    if (argument.startsWith(`--${name}=`)) results.push(argument.slice(name.length + 3))
  }
  return results
}

function readJson(file: string): unknown {
  return JSON.parse(readFileSync(resolve(process.cwd(), file), 'utf8')) as unknown
}

function object(value: unknown, field: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${field}는 객체여야 합니다.`)
  }
  return value as Record<string, unknown>
}

function text(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${field}이(가) 비었습니다.`)
  return value.trim()
}

function parseCandidates(document: unknown): Candidate[] {
  const rows = object(document, '후보').candidates
  if (!Array.isArray(rows)) throw new Error('후보 candidates가 배열이 아닙니다.')
  return rows.map((value, index) => {
    const row = object(value, `candidates[${index}]`)
    const person = object(row.person, `candidates[${index}].person`)
    const book = object(row.book, `candidates[${index}].book`)
    return {
      person: {
        id: text(person.id, `candidates[${index}].person.id`),
        slug: text(person.slug, `candidates[${index}].person.slug`),
      },
      book: {
        contentId: text(book.contentId, `candidates[${index}].book.contentId`),
        title: typeof book.title === 'string' && book.title.trim() ? book.title.trim() : null,
        isbn: typeof book.isbn === 'string' && book.isbn.trim() ? book.isbn.trim() : null,
        verified: typeof book.verified === 'boolean' ? book.verified : null,
        sourcePrimary: book.sources && typeof book.sources === 'object' && !Array.isArray(book.sources)
          && typeof (book.sources as Record<string, unknown>).primary === 'string'
          ? ((book.sources as Record<string, unknown>).primary as string)
          : null,
      },
    }
  })
}

function parseReviews(document: unknown): Review[] {
  const rows = object(document, '검수').reviews
  if (!Array.isArray(rows)) throw new Error('검수 reviews가 배열이 아닙니다.')
  const slugs = new Set<string>()
  return rows.map((value, index) => {
    const row = object(value, `reviews[${index}]`)
    const slug = text(row.slug, `reviews[${index}].slug`)
    if (slugs.has(slug)) throw new Error(`검수 slug가 중복됩니다: ${slug}`)
    slugs.add(slug)
    if (!Array.isArray(row.selections)) throw new Error(`${slug}.selections가 배열이 아닙니다.`)
    const contentIds = new Set<string>()
    const selections = row.selections.map((value, selectionIndex): ReviewSelection => {
      const selection = object(value, `${slug}.selections[${selectionIndex}]`)
      const contentId = text(selection.contentId, `${slug}.contentId`)
      if (contentIds.has(contentId)) throw new Error(`${slug}에 같은 contentId가 중복됩니다: ${contentId}`)
      contentIds.add(contentId)
      const relationType = text(selection.relationType, `${slug}.${contentId}.relationType`)
      if (relationType !== 'appearance' && relationType !== 'related') {
        throw new Error(`${slug}.${contentId}: 지원하지 않는 관계입니다.`)
      }
      const description = selection.description
      if (relationType === 'appearance' && (typeof description !== 'string' || !description.trim())) {
        throw new Error(`${slug}.${contentId}: 등장 설명이 필요합니다.`)
      }
      if (relationType === 'related' && description !== null) {
        throw new Error(`${slug}.${contentId}: 연관 도서 설명은 null이어야 합니다.`)
      }
      const appearanceDescription = typeof description === 'string'
        ? description.trim()
        : null
      return {
        contentId,
        relationType,
        description: relationType === 'appearance' ? appearanceDescription : null,
        rationale: text(selection.rationale, `${slug}.${contentId}.rationale`),
      }
    })
    return { slug, selections }
  })
}

async function loadRows(
  client: SupabaseClient,
  contentId: string,
): Promise<FigureBookCharacterRow[]> {
  const { data, error } = await client
    .from('figure_book_characters')
    .select('content_id,celeb_id,relation_type,sort_order,description,description_en')
    .eq('content_id', contentId)
    .order('sort_order')
    .order('celeb_id')
  if (error) throw new Error(`${contentId}: 현재 관계 조회 실패: ${error.message}`)
  return (data ?? []) as FigureBookCharacterRow[]
}

async function applyPlan(
  contentId: string,
  plan: ReturnType<typeof buildFigureBookBatchPlan>,
): Promise<void> {
  const { error: sourceError } = await db
    .from('figure_book_contents')
    .upsert({ content_id: contentId }, { onConflict: 'content_id', ignoreDuplicates: true })
  if (sourceError) throw new Error(`${contentId}: 인물 도서 지정 실패: ${sourceError.message}`)

  if (plan.writeRows.length > 0) {
    const { error } = await db
      .from('figure_book_characters')
      .upsert(plan.writeRows, { onConflict: 'content_id,celeb_id' })
    if (error) throw new Error(`${contentId}: 관계 저장 실패: ${error.message}`)
    const { error: touchError } = await db
      .from('figure_book_contents')
      .update({ updated_at: new Date().toISOString() })
      .eq('content_id', contentId)
    if (touchError) throw new Error(`${contentId}: 갱신 시각 저장 실패: ${touchError.message}`)
  }
  assertExactFigureBookReadback(plan.expectedRows, await loadRows(db, contentId))
}

async function main(): Promise<void> {
  const candidatesFile = argumentValue('candidates')
  const reviewsFiles = argumentValues('reviews')
  const onlySlug = argumentValue('slug')
  const apply = process.argv.includes('--apply')
  const verifiedKakaoOnly = process.argv.includes('--verified-kakao-only')
  const summaryOnly = process.argv.includes('--summary-only')
  if (!candidatesFile || reviewsFiles.length === 0) throw new Error('--candidates와 --reviews가 필요합니다.')

  const candidates = parseCandidates(readJson(candidatesFile))
  const allReviews = reviewsFiles.flatMap((file) => parseReviews(readJson(file)))
  const duplicateSlugs = allReviews
    .map((review) => review.slug)
    .filter((slug, index, slugs) => slugs.indexOf(slug) !== index)
  if (duplicateSlugs.length > 0) {
    throw new Error(`검수 파일 사이에 slug가 중복됩니다: ${[...new Set(duplicateSlugs)].join(', ')}`)
  }
  const reviews = allReviews.filter((review) => !onlySlug || review.slug === onlySlug)
  if (onlySlug && reviews.length === 0) throw new Error(`검수 파일에서 slug를 찾을 수 없습니다: ${onlySlug}`)

  const candidateByKey = new Map<string, Candidate>()
  for (const candidate of candidates) {
    candidateByKey.set(`${candidate.person.slug}\u0000${candidate.book.contentId}`, candidate)
  }
  const selectedByContent = new Map<string, ResolvedFigureBookCharacter[]>()
  const titleByContent = new Map<string, string | null>()
  const held: Array<{
    slug: string
    contentId: string
    title: string | null
    reasons: string[]
  }> = []
  for (const review of reviews) {
    for (const selection of review.selections) {
      const candidate = candidateByKey.get(`${review.slug}\u0000${selection.contentId}`)
      if (!candidate) {
        throw new Error(`${review.slug}: 후보에 없던 contentId입니다: ${selection.contentId}`)
      }
      if (verifiedKakaoOnly) {
        const reasons = [
          candidate.book.sourcePrimary !== 'kakao_book' ? 'source_not_kakao_book' : null,
          !candidate.book.isbn ? 'missing_isbn' : null,
          candidate.book.verified !== true ? 'not_verified' : null,
        ].filter((reason): reason is string => Boolean(reason))
        if (reasons.length > 0) {
          held.push({
            slug: review.slug,
            contentId: selection.contentId,
            title: candidate.book.title,
            reasons,
          })
          continue
        }
      }
      const rows = selectedByContent.get(selection.contentId) ?? []
      rows.push({
        celebId: candidate.person.id,
        slug: candidate.person.slug,
        relationType: selection.relationType,
        description: selection.description,
      })
      selectedByContent.set(selection.contentId, rows)
      titleByContent.set(selection.contentId, candidate.book.title)
    }
  }

  const summaries: Array<{
    contentId: string
    title: string | null
    inserts: number
    updates: number
    unchanged: number
    preservedAppearance: number
  }> = []
  const plans: Array<{
    contentId: string
    plan: ReturnType<typeof buildFigureBookBatchPlan>
  }> = []
  for (const [contentId, selections] of selectedByContent) {
    const current = await loadRows(db, contentId)
    const currentByCelebId = new Map(current.map((row) => [row.celeb_id, row]))
    let preservedAppearance = 0
    const safeSelections = selections.flatMap((selection) => {
      const existing = currentByCelebId.get(selection.celebId)
      if (existing?.relation_type === 'appearance' && selection.relationType === 'related') {
        preservedAppearance += 1
        return []
      }
      return [selection]
    })
    const plan = buildFigureBookBatchPlan(contentId, safeSelections, current)
    const counts = { insert: 0, update: 0, unchanged: 0 }
    for (const change of plan.changes) counts[change.kind] += 1
    summaries.push({
      contentId,
      title: titleByContent.get(contentId) ?? null,
      inserts: counts.insert,
      updates: counts.update,
      unchanged: counts.unchanged,
      preservedAppearance,
    })
    plans.push({ contentId, plan })
  }

  const output = {
    mode: apply ? 'apply' : 'dry-run',
    eligibility: verifiedKakaoOnly ? 'verified-kakao-with-isbn' : 'all-reviewed',
    reviewedPeople: reviews.length,
    eligiblePeople: new Set(
      [...selectedByContent.values()].flatMap((rows) => rows.map((row) => row.slug)),
    ).size,
    reviewedRelations: reviews.reduce((sum, review) => sum + review.selections.length, 0),
    selectedRelations: [...selectedByContent.values()].reduce((sum, rows) => sum + rows.length, 0),
    heldRelations: held.length,
    heldPeople: new Set(held.map((row) => row.slug)).size,
    heldReasons: held.reduce<Record<string, number>>((counts, row) => {
      for (const reason of row.reasons) counts[reason] = (counts[reason] ?? 0) + 1
      return counts
    }, {}),
    works: summaries.length,
    totals: summaries.reduce((result, row) => ({
      inserts: result.inserts + row.inserts,
      updates: result.updates + row.updates,
      unchanged: result.unchanged + row.unchanged,
      preservedAppearance: result.preservedAppearance + row.preservedAppearance,
    }), { inserts: 0, updates: 0, unchanged: 0, preservedAppearance: 0 }),
    ...(!summaryOnly ? { items: summaries, heldItems: held } : {}),
  }
  console.log(JSON.stringify(output, null, 2))
  if (!apply) return

  let appliedWorks = 0
  for (const { contentId, plan } of plans) {
    await applyPlan(contentId, plan)
    appliedWorks += 1
    if (!summaryOnly) {
      console.log(`APPLIED ${contentId}`)
    } else if (appliedWorks % 100 === 0 || appliedWorks === plans.length) {
      console.log(`APPLIED ${appliedWorks}/${plans.length}`)
    }
  }

  const cacheTargets: CacheItemTarget[] = [
    ...plans.map(({ contentId }) => ({ domain: CACHE_TAGS.CONTENTS, id: contentId })),
    ...[...selectedByContent.values()].flatMap((rows): CacheItemTarget[] => rows.flatMap((row) => [
      { domain: CACHE_TAGS.CELEBS, id: row.celebId },
      { domain: CACHE_TAGS.CELEBS, id: row.slug },
    ])),
  ]
  await revalidateWebItems(cacheTargets)
  console.log(`REVALIDATED ${new Set(cacheTargets.map((target) => `${target.domain}:${target.id}`)).size} item tags`)
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
