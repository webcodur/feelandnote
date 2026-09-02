/** 픽션 원전 BOOK의 잘린 카카오 검색 요약을 다음 책 상세의 전체 소개로 교체한다. */

import { createClient } from '@supabase/supabase-js'
import { getBookByIsbnWithFullDescription } from '@feelandnote/content-search/kakao-books'
import { CACHE_TAGS, type CacheItemTarget } from '@feelandnote/shared/constants/cache-tags'
import { revalidateWebItems } from '../../src/lib/revalidate-web'
import { decideDescriptionBackfill } from './source-book-description-contract'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) throw new Error('NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY가 필요합니다.')

const db = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
const PAGE_SIZE = 500
const LOOKUP_CONCURRENCY = 4

type ContentRow = { id: string; external_id: string | null }
type EditionRow = { id: number; content_id: string; title: string; description: string | null; isbn: string | null; sources: unknown }
type Target = { editionId: number; contentId: string; externalId: string | null; title: string; description: string | null; isbn: string | null; sources: unknown }
type Result = { target: Target; kind: 'update' | 'unchanged' | 'skip' | 'lookup-error'; reason: string; description?: string; sourceUrl?: string }

function parseOptions(): { apply: boolean; limit: number | null } {
  const args = process.argv.slice(2)
  const allowed = new Set(['--apply', '--limit'])
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index]
    if (!allowed.has(argument) && args[index - 1] !== '--limit') {
      throw new Error(`지원하지 않는 인자: ${argument}`)
    }
  }
  const limitIndex = args.indexOf('--limit')
  const limit = limitIndex < 0 ? null : Number(args[limitIndex + 1])
  if (limitIndex >= 0 && (!Number.isInteger(limit) || Number(limit) <= 0)) {
    throw new Error('--limit에는 1 이상의 정수가 필요합니다.')
  }
  return { apply: args.includes('--apply'), limit }
}

async function loadTargets(limit: number | null): Promise<Target[]> {
  const editions: EditionRow[] = []
  let cursor = 0
  while (true) {
    let query = db.from('fiction_source_editions')
      .select('id,content_id,title,description,isbn,sources')
      .eq('locale', 'ko')
      .order('id')
      .limit(PAGE_SIZE)
    if (cursor) query = query.gt('id', cursor)
    const { data, error } = await query
    if (error) throw new Error(`원전 판본 목록 조회 실패: ${error.message}`)
    const rows = (data ?? []) as EditionRow[]
    editions.push(...rows)
    if (rows.length < PAGE_SIZE) break
    cursor = rows.at(-1)?.id ?? 0
  }

  const sourceIds = [...new Set(editions.map((row) => row.content_id))]
  const contents: ContentRow[] = []
  for (let index = 0; index < sourceIds.length; index += PAGE_SIZE) {
    const ids = sourceIds.slice(index, index + PAGE_SIZE)
    const contentResult = await db.from('contents').select('id,external_id').in('id', ids)
    if (contentResult.error) throw new Error(`원전 작품 조회 실패: ${contentResult.error.message}`)
    contents.push(...contentResult.data as ContentRow[])
  }

  const contentById = new Map(contents.map((row) => [row.id, row]))
  return editions
    .map((row): Target => ({
      editionId: row.id,
      contentId: row.content_id,
      externalId: contentById.get(row.content_id)?.external_id ?? null,
      title: row.title,
      description: row.description,
      isbn: row.isbn,
      sources: row.sources,
    }))
    .sort((a, b) => a.title.localeCompare(b.title, 'ko') || a.contentId.localeCompare(b.contentId))
    .slice(0, limit ?? undefined)
}

async function concurrentMap<T, R>(items: T[], worker: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length)
  let next = 0
  const runners = Array.from({ length: Math.min(LOOKUP_CONCURRENCY, items.length) }, async () => {
    while (next < items.length) {
      const index = next
      next += 1
      results[index] = await worker(items[index])
    }
  })
  await Promise.all(runners)
  return results
}

async function inspect(target: Target): Promise<Result> {
  const isbn = target.isbn?.replace(/[^0-9X]/giu, '') ?? ''
  if (!isbn) return { target, kind: 'skip', reason: 'isbn 없음' }
  try {
    const lookup = await getBookByIsbnWithFullDescription(isbn)
    if (!lookup) return { target, kind: 'skip', reason: '카카오 판본 없음' }
    if (lookup.book.metadata.isbn.replace(/[^0-9X]/giu, '') !== isbn) {
      return { target, kind: 'skip', reason: 'ISBN 불일치' }
    }
    const decision = decideDescriptionBackfill(target.description, lookup.fullDescription)
    if (decision.kind !== 'update') return { target, kind: decision.kind, reason: decision.reason }
    return {
      target,
      kind: 'update',
      reason: `${target.description?.trim().length ?? 0}→${decision.description.length}`,
      description: decision.description,
      sourceUrl: lookup.book.metadata.link,
    }
  } catch (error) {
    return { target, kind: 'lookup-error', reason: error instanceof Error ? error.message : String(error) }
  }
}

async function applyResult(result: Result): Promise<void> {
  if (result.kind !== 'update' || !result.description || !result.sourceUrl) return
  const sources = Array.isArray(result.target.sources)
    ? [...new Set([...result.target.sources, result.sourceUrl])]
    : {
        ...(result.target.sources && typeof result.target.sources === 'object'
          ? result.target.sources
          : {}),
        description: result.sourceUrl,
      }
  let query = db.from('fiction_source_editions')
    .update({ description: result.description, sources })
    .eq('id', result.target.editionId)
  query = result.target.description === null
    ? query.is('description', null)
    : query.eq('description', result.target.description)
  const { data, error } = await query.select('description').maybeSingle()
  if (error) throw new Error(`${result.target.title} 저장 실패: ${error.message}`)
  if (data?.description !== result.description) throw new Error(`${result.target.title} 저장 전 값이 달라졌습니다.`)

  // 새 구조 배포 전 코드와 일반 콘텐츠 화면이 쓰는 호환 스냅샷도 같은 ISBN일 때만 맞춘다.
  if (result.target.isbn) {
    const { error: legacyError } = await db.from('content_locales')
      .update({ description: result.description, sources })
      .eq('content_id', result.target.contentId)
      .eq('locale', 'ko')
      .eq('isbn', result.target.isbn)
    if (legacyError) throw new Error(`${result.target.title} 호환 소개 저장 실패: ${legacyError.message}`)
  }
}

async function revalidate(results: Result[]): Promise<void> {
  const contentIds = results.map((result) => result.target.contentId)
  const { data: relations, error: relationError } = await db
    .from('fiction_source_characters').select('content_id,celeb_id').in('content_id', contentIds)
  if (relationError) throw new Error(`원전 인물 캐시 조회 실패: ${relationError.message}`)
  const celebIds = [...new Set((relations ?? []).map((row) => row.celeb_id))]
  const { data: celebs, error: celebError } = celebIds.length
    ? await db.from('celebs').select('id,slug').in('id', celebIds)
    : { data: [], error: null }
  if (celebError) throw new Error(`인물 캐시 식별자 조회 실패: ${celebError.message}`)

  const targets: CacheItemTarget[] = [
    ...results.flatMap((result): CacheItemTarget[] => [
      { domain: CACHE_TAGS.CONTENTS, id: result.target.contentId },
      ...(result.target.externalId && result.target.externalId !== result.target.contentId
        ? [{ domain: CACHE_TAGS.CONTENTS, id: result.target.externalId }]
        : []),
    ]),
    ...(celebs ?? []).flatMap((celeb): CacheItemTarget[] => [
      { domain: CACHE_TAGS.CELEBS, id: celeb.id },
      ...(celeb.slug ? [{ domain: CACHE_TAGS.CELEBS, id: celeb.slug }] : []),
    ]),
  ]
  await revalidateWebItems(targets, [CACHE_TAGS.FICTION_SOURCES])
}

async function main() {
  const options = parseOptions()
  const targets = await loadTargets(options.limit)
  console.log(`원전 한국어 판본 ${targets.length}건 조회 · ${options.apply ? '실반영' : 'dry-run'}`)
  const results = await concurrentMap(targets, inspect)
  for (const result of results.filter((item) => item.kind !== 'unchanged')) {
    console.log(`${result.kind === 'update' ? '✔' : '-'} ${result.target.title} · ${result.reason}`)
  }
  const updates = results.filter((result) => result.kind === 'update')
  const count = (kind: Result['kind']) => results.filter((result) => result.kind === kind).length
  console.log(`갱신 ${updates.length} · 유지 ${count('unchanged')} · 건너뜀 ${count('skip')} · 조회실패 ${count('lookup-error')}`)
  if (!options.apply || updates.length === 0) return
  for (const result of updates) await applyResult(result)
  await revalidate(updates)
  console.log(`반영·정확값 재조회·관련 원전/인물 캐시 갱신 완료 ${updates.length}권`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
