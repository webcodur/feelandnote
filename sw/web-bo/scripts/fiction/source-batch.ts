/**
 * 조사 완료된 작품 하나의 인물 관계와 한국어 등장 설명을 증분 반영한다.
 * 기본은 dry-run이며 --apply에서만 기존 운영 DB 행을 추가·갱신한다.
 * 영어 설명은 실제 영문판과 Amazon 링크를 확인하는 별도 작업에서만 다룬다.
 * 콘텐츠 신규 생성과 기존 관계 삭제는 하지 않는다.
 *
 * 실행:
 *   pnpm fiction:source:batch -- --file ../../data/celeb/fiction/<work>.json
 *   pnpm fiction:source:batch -- --file ../../data/celeb/fiction/<work>.json --apply
 */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient, type SupabaseClient as DatabaseClient } from '@supabase/supabase-js'
import {
  assertExactFictionSourceReadback,
  buildFictionSourceBatchPlan,
  parseFictionSourceBatchManifest,
  type FictionSourceBatchManifest,
  type FictionSourceCharacterRow,
  type ResolvedFictionSourceCharacter,
} from './source-batch-contract'

type ContentRow = {
  id: string
  type: string
}

type FictionSourceRow = {
  content_id: string
}

type CelebRow = {
  id: string
  slug: string
}

type SourceBatchSnapshot = {
  content: ContentRow
  sourceDesignated: boolean
  rows: FictionSourceCharacterRow[]
}

function argumentValue(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`)
  if (index >= 0) return process.argv[index + 1]
  const inline = process.argv.find((argument) => argument.startsWith(`--${name}=`))
  return inline?.slice(name.length + 3)
}

async function loadSourceBatchSnapshot(
  db: DatabaseClient,
  contentId: string,
): Promise<SourceBatchSnapshot> {
  const [contentResult, sourceResult, rowsResult] = await Promise.all([
    db
      .from('contents')
      .select('id,type')
      .eq('id', contentId)
      .maybeSingle(),
    db
      .from('fiction_source_contents')
      .select('content_id')
      .eq('content_id', contentId)
      .maybeSingle(),
    db
      .from('fiction_source_characters')
      .select('content_id,celeb_id,relation_type,sort_order,description,description_en')
      .eq('content_id', contentId)
      .order('sort_order')
      .order('celeb_id'),
  ])

  if (contentResult.error) throw new Error(`콘텐츠 조회 실패: ${contentResult.error.message}`)
  if (!contentResult.data) {
    throw new Error(`기존 contents에서 contentId를 찾을 수 없습니다: ${contentId}`)
  }
  if ((contentResult.data as ContentRow).type !== 'BOOK') {
    throw new Error(`인물 도서에는 BOOK만 지정할 수 있습니다: ${(contentResult.data as ContentRow).type}`)
  }
  if (sourceResult.error) throw new Error(`인물 도서 지정 조회 실패: ${sourceResult.error.message}`)
  if (rowsResult.error) throw new Error(`기존 등장 관계 조회 실패: ${rowsResult.error.message}`)

  return {
    content: contentResult.data as ContentRow,
    sourceDesignated: Boolean(sourceResult.data as FictionSourceRow | null),
    rows: (rowsResult.data ?? []) as FictionSourceCharacterRow[],
  }
}

async function loadCelebs(
  db: DatabaseClient,
  column: 'id' | 'slug',
  values: string[],
): Promise<CelebRow[]> {
  if (values.length === 0) return []
  const { data, error } = await db
    .from('celebs')
    .select('id,slug')
    .in(column, values)
  if (error) throw new Error(`인물 조회 실패 (${column}): ${error.message}`)
  return (data ?? []) as CelebRow[]
}

async function resolveCharacters(
  db: DatabaseClient,
  manifest: FictionSourceBatchManifest,
): Promise<ResolvedFictionSourceCharacter[]> {
  const slugs = manifest.characters.flatMap((character) => character.slug ? [character.slug] : [])
  const celebIds = manifest.characters.flatMap((character) => character.celebId ? [character.celebId] : [])
  const [bySlugRows, byIdRows] = await Promise.all([
    loadCelebs(db, 'slug', slugs),
    loadCelebs(db, 'id', celebIds),
  ])
  const bySlug = new Map(bySlugRows.map((row) => [row.slug, row]))
  const byId = new Map(byIdRows.map((row) => [row.id, row]))

  return manifest.characters.map((character, index) => {
    const profile = character.slug
      ? bySlug.get(character.slug)
      : byId.get(character.celebId!)
    const identifier = character.slug ?? character.celebId!
    if (!profile) throw new Error(`characters[${index}] 인물을 찾을 수 없습니다: ${identifier}`)
    return {
      celebId: profile.id,
      slug: profile.slug,
      relationType: character.relationType,
      description: character.description,
      ...(character.sortOrder === undefined ? {} : { sortOrder: character.sortOrder }),
    }
  })
}

async function verifySourceDesignation(db: DatabaseClient, contentId: string): Promise<void> {
  const { data, error } = await db
    .from('fiction_source_contents')
    .select('content_id')
    .eq('content_id', contentId)
    .maybeSingle()
  if (error) throw new Error(`인물 도서 지정 readback 실패: ${error.message}`)
  if (!data || (data as FictionSourceRow).content_id !== contentId) {
    throw new Error(`인물 도서 지정 readback 실패: ${contentId}`)
  }
}

async function loadReadbackRows(
  db: DatabaseClient,
  contentId: string,
): Promise<FictionSourceCharacterRow[]> {
  const { data, error } = await db
    .from('fiction_source_characters')
    .select('content_id,celeb_id,relation_type,sort_order,description,description_en')
    .eq('content_id', contentId)
    .order('sort_order')
    .order('celeb_id')
  if (error) throw new Error(`등장 관계 readback 실패: ${error.message}`)
  return (data ?? []) as FictionSourceCharacterRow[]
}

async function applySourceBatch(
  db: DatabaseClient,
  contentId: string,
  sourceDesignated: boolean,
  writeRows: FictionSourceCharacterRow[],
  expectedRows: FictionSourceCharacterRow[],
): Promise<void> {
  if (!sourceDesignated) {
    const { error } = await db
      .from('fiction_source_contents')
      .upsert({ content_id: contentId }, { onConflict: 'content_id', ignoreDuplicates: true })
    if (error) throw new Error(`인물 도서 지정 실패: ${error.message}`)
  }

  if (writeRows.length > 0) {
    const { error } = await db
      .from('fiction_source_characters')
      .upsert(writeRows, { onConflict: 'content_id,celeb_id' })
    if (error) throw new Error(`등장 관계 증분 저장 실패: ${error.message}`)

    const { error: touchError } = await db
      .from('fiction_source_contents')
      .update({ updated_at: new Date().toISOString() })
      .eq('content_id', contentId)
    if (touchError) throw new Error(`인물 도서 갱신 시각 저장 실패: ${touchError.message}`)
  }

  await verifySourceDesignation(db, contentId)
  assertExactFictionSourceReadback(expectedRows, await loadReadbackRows(db, contentId))
}

async function main(): Promise<void> {
  const file = argumentValue('file')
  const apply = process.argv.includes('--apply')
  if (!file) throw new Error('--file <작품 JSON>이 필요합니다.')
  if (!process.env.NEXT_PUBLIC_DB_API_URL || !process.env.DB_SECRET_KEY) {
    throw new Error('NEXT_PUBLIC_DB_API_URL과 DB_SECRET_KEY가 필요합니다.')
  }

  const manifest = parseFictionSourceBatchManifest(
    JSON.parse(readFileSync(resolve(process.cwd(), file), 'utf8')) as unknown,
  )
  const db = createClient(
    process.env.NEXT_PUBLIC_DB_API_URL,
    process.env.DB_SECRET_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
  const [snapshot, characters] = await Promise.all([
    loadSourceBatchSnapshot(db, manifest.contentId),
    resolveCharacters(db, manifest),
  ])
  const plan = buildFictionSourceBatchPlan(manifest.contentId, characters, snapshot.rows)
  const counts = plan.changes.reduce(
    (result, change) => ({ ...result, [change.kind]: result[change.kind] + 1 }),
    { insert: 0, update: 0, unchanged: 0 },
  )

  console.log(JSON.stringify({
    mode: apply ? 'apply' : 'dry-run',
    contentId: snapshot.content.id,
    title: manifest.title ?? null,
    contentType: snapshot.content.type,
    sourceDesignation: snapshot.sourceDesignated ? 'keep-existing' : 'create',
    counts,
    changes: plan.changes.map((change) => ({
      kind: change.kind,
      slug: change.slug,
      celebId: change.after.celeb_id,
      relationType: change.after.relation_type,
      sortOrder: change.after.sort_order,
    })),
  }, null, 2))

  if (!apply) return
  await applySourceBatch(
    db,
    manifest.contentId,
    snapshot.sourceDesignated,
    plan.writeRows,
    plan.expectedRows,
  )
  console.log(`APPLIED ${manifest.contentId}: exact readback 통과`)
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
