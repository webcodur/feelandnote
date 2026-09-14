/**
 * 티스토리 영화 240편이 참조하는 현재 DB 감상 관계 inventory.
 *
 * - `_order.json`의 순서를 그대로 따라간다.
 * - 현재 자료의 picked 관계와, 같은 작품·인물·목록에서 `usableReview`를
 *   통과하는 교체 후보를 모두 모은다.
 * - 동일한 `celeb_contents.id`는 결과에 한 번만 쓴다.
 * - DB에는 select만 실행한다. 결과는 BLOG_ASSETS/tistory-cinema에 쓴다.
 *
 * 실행 위치: sw/web-bo
 *   node --env-file=.env --import tsx scripts/tistory-cinema/luna-cinema-full-inventory.mts
 */
import fs from 'node:fs'
import path from 'node:path'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { ASSETS } from '../blog-assets.mjs'
import { usableReview } from './lib/quality.mts'

const UNKNOWN = 'unknown'
const PAGE_SIZE = 1000
const CHANNEL_DIR = path.join(ASSETS, 'tistory-cinema')
const ORDER_FILE = path.join(CHANNEL_DIR, '_order.json')
const OUTPUT_FILE = path.join(CHANNEL_DIR, 'luna-cinema-full-inventory.json')

type Kind = 'work' | 'person' | 'list' | 'unknown'

type OrderEntry = {
  name: string
  at?: string
  id?: number
}

type Content = {
  id: string
  type: string | null
  external_id: string | null
}

type Locale = {
  content_id: string
  title: string | null
  locale: string
}

type Celeb = {
  id: string
  slug: string | null
  nickname: string | null
  publication_status?: string | null
}

type Relation = {
  id: string
  celeb_id: string
  content_id: string
  review: string | null
  review_en: string | null
  source_url: string | null
}

type CuratedList = {
  id: string
  slug: string
  title: string | null
}

type CuratedListItem = {
  id: string
  list_id: string
  content_id: string | null
  rank?: number | null
  sort_order?: number | null
  hidden: boolean | null
  raw_title?: string | null
}

type UnknownReference = {
  orderIndex: number
  articleName: string
  kind: Kind
  slot: string | number
  reason: string
  source: {
    rid: string | null
    celeb_id: string | null
    content_id: string | null
    slug: string | null
    work: string | null
  }
}

type ArticleStats = {
  orderIndex: number
  name: string
  kind: Kind
  rawCount: number
  matchedRawCount: number
  unmatchedCount: number
  pickedRelationCount: number
  candidateCount: number
  relationCount: number
  listItemCount: number | null
  movieListItemCount: number | null
  allVisibleListItemsRead: boolean
  matched: boolean
}

type InventoryRow = {
  id: string
  rid: string
  celeb_id: string
  content_id: string
  nickname: string
  slug: string
  work: string
  review: string | null
  current_review: string | null
  review_en: string | null
  source_url: string | null
  articleNames: string[]
  firstOrderIndex: number
  usableReview: boolean
  currentPicked: boolean
}

type Material = {
  work?: { id?: unknown; title?: unknown }
  celeb?: { slug?: unknown }
  list?: { slug?: unknown }
  picked?: Array<Record<string, unknown>>
}

async function readRows<T>(db: SupabaseClient, table: string, columns: string): Promise<T[]> {
  const rows: T[] = []
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await db.from(table).select(columns).range(offset, offset + PAGE_SIZE - 1)
    if (error) throw new Error(`${table} 조회 실패: ${error.message}`)
    rows.push(...(data as T[]))
    if ((data as T[]).length < PAGE_SIZE) return rows
  }
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null
}

function materialKind(material: Material): Kind {
  if (material.work) return 'work'
  if (material.celeb) return 'person'
  if (material.list) return 'list'
  return 'unknown'
}

function sourceOf(values: {
  rid?: unknown
  celebId?: unknown
  contentId?: unknown
  slug?: unknown
  work?: unknown
}) {
  return {
    rid: asString(values.rid),
    celeb_id: asString(values.celebId),
    content_id: asString(values.contentId),
    slug: asString(values.slug),
    work: asString(values.work),
  }
}

function addUnknown(
  unknowns: UnknownReference[],
  orderIndex: number,
  articleName: string,
  kind: Kind,
  slot: string | number,
  reason: string,
  source: ReturnType<typeof sourceOf>,
) {
  unknowns.push({ orderIndex, articleName, kind, slot, reason, source })
}

const order = JSON.parse(fs.readFileSync(ORDER_FILE, 'utf8')) as OrderEntry[]
if (!Array.isArray(order)) throw new Error('_order.json이 배열이 아니다')

const db = createClient(process.env.NEXT_PUBLIC_DB_API_URL!, process.env.DB_SECRET_KEY!)
const [contents, locales, celebs, relations, lists, listItems] = await Promise.all([
  readRows<Content>(db, 'contents', 'id, type, external_id'),
  readRows<Locale>(db, 'content_locales', 'content_id, title, locale'),
  readRows<Celeb>(db, 'celebs', 'id, slug, nickname, publication_status'),
  readRows<Relation>(db, 'celeb_contents', 'id, celeb_id, content_id, review, review_en, source_url'),
  readRows<CuratedList>(db, 'curated_lists', 'id, slug, title'),
  readRows<CuratedListItem>(db, 'curated_list_items', 'id, list_id, content_id, rank, sort_order, hidden, raw_title'),
])

const contentById = new Map(contents.map((row) => [row.id, row]))
const movieContentIds = new Set(
  contents
    .filter((row) => (row.external_id ?? '').startsWith('tmdb-movie-'))
    .map((row) => row.id),
)
const titleByContent = new Map(
  locales
    .filter((row) => row.locale === 'ko')
    .map((row) => [row.content_id, row.title]),
)
const contentIdsByTitle = new Map<string, string[]>()
for (const row of locales) {
  if (row.locale !== 'ko' || !row.title || !movieContentIds.has(row.content_id)) continue
  contentIdsByTitle.set(row.title, [...(contentIdsByTitle.get(row.title) ?? []), row.content_id])
}
const celebById = new Map(celebs.map((row) => [row.id, row]))
const celebBySlug = new Map(celebs.filter((row) => row.slug).map((row) => [row.slug!, row]))
const relationById = new Map(relations.map((row) => [row.id, row]))
const relationsByPair = new Map<string, Relation[]>()
const relationsByContent = new Map<string, Relation[]>()
const relationsByCeleb = new Map<string, Relation[]>()
for (const row of relations) {
  const pair = `${row.celeb_id}/${row.content_id}`
  relationsByPair.set(pair, [...(relationsByPair.get(pair) ?? []), row])
  relationsByContent.set(row.content_id, [...(relationsByContent.get(row.content_id) ?? []), row])
  relationsByCeleb.set(row.celeb_id, [...(relationsByCeleb.get(row.celeb_id) ?? []), row])
}
for (const rows of [relationsByPair, relationsByContent, relationsByCeleb]) {
  rows.forEach((value) => value.sort((a, b) => a.id.localeCompare(b.id)))
}
const listBySlug = new Map(lists.map((row) => [row.slug, row]))
const visibleItemsByList = new Map<string, CuratedListItem[]>()
for (const item of listItems) {
  if (item.hidden !== false) continue
  visibleItemsByList.set(item.list_id, [...(visibleItemsByList.get(item.list_id) ?? []), item])
}
for (const rows of visibleItemsByList.values()) {
  rows.sort((a, b) => (a.rank ?? 9999) - (b.rank ?? 9999) || (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.id.localeCompare(b.id))
}

const unknowns: UnknownReference[] = []
const articleStats: ArticleStats[] = []
const inventory = new Map<string, InventoryRow>()

function relationForPair(celebId: string | null, contentId: string | null): { relation: Relation | null; reason?: string } {
  if (!celebId || !contentId) return { relation: null, reason: !celebId ? 'celeb_not_found' : 'content_not_found' }
  const matches = relationsByPair.get(`${celebId}/${contentId}`) ?? []
  if (matches.length !== 1) return { relation: null, reason: matches.length ? 'relation_ambiguous' : 'relation_not_found' }
  return { relation: matches[0] }
}

function titleFallback(title: unknown): { contentId: string | null; reason?: string } {
  const value = asString(title)
  if (!value) return { contentId: null, reason: 'content_not_found' }
  const ids = [...new Set(contentIdsByTitle.get(value) ?? [])]
  if (ids.length !== 1) return { contentId: null, reason: ids.length ? 'content_ambiguous' : 'content_not_found' }
  return { contentId: ids[0] }
}

function addRelation(orderIndex: number, articleName: string, relation: Relation, currentPicked: boolean, relationIds: Set<string>) {
  relationIds.add(relation.id)
  const celeb = celebById.get(relation.celeb_id)
  const row = inventory.get(relation.id)
  if (row) {
    if (!row.articleNames.includes(articleName)) row.articleNames.push(articleName)
    row.firstOrderIndex = Math.min(row.firstOrderIndex, orderIndex)
    row.currentPicked ||= currentPicked
    return
  }
  const workTitle = titleByContent.get(relation.content_id) ?? UNKNOWN
  const nickname = celeb?.nickname ?? UNKNOWN
  const slug = celeb?.slug ?? UNKNOWN
  const currentReview = relation.review
  inventory.set(relation.id, {
    id: relation.id,
    rid: relation.id,
    celeb_id: relation.celeb_id,
    content_id: relation.content_id,
    nickname,
    slug,
    work: workTitle ?? UNKNOWN,
    review: currentReview,
    current_review: currentReview,
    review_en: relation.review_en,
    source_url: relation.source_url,
    articleNames: [articleName],
    firstOrderIndex: orderIndex,
    usableReview: usableReview(currentReview, relation.id),
    currentPicked,
  })
}

function addCandidateRelations(
  orderIndex: number,
  articleName: string,
  relationRows: Relation[],
  pickedIds: Set<string>,
  relationIds: Set<string>,
) {
  for (const relation of relationRows) {
    if (usableReview(relation.review, relation.id) || pickedIds.has(relation.id)) {
      addRelation(orderIndex, articleName, relation, pickedIds.has(relation.id), relationIds)
    }
  }
}

for (const [arrayIndex, entry] of order.entries()) {
  const orderIndex = arrayIndex + 1
  const articleName = asString(entry.name) ?? `${UNKNOWN}-${orderIndex}`
  const file = path.join(CHANNEL_DIR, `${articleName}.json`)
  const relationIds = new Set<string>()
  const pickedIds = new Set<string>()

  let material: Material | null = null
  if (!fs.existsSync(file)) {
    addUnknown(unknowns, orderIndex, articleName, 'unknown', 0, 'material_file_not_found', sourceOf({ work: articleName }))
  } else {
    try {
      material = JSON.parse(fs.readFileSync(file, 'utf8')) as Material
    } catch {
      addUnknown(unknowns, orderIndex, articleName, 'unknown', 0, 'material_json_invalid', sourceOf({ work: articleName }))
    }
  }

  const kind = material ? materialKind(material) : 'unknown'
  let rawCount = 0
  let matchedRawCount = 0
  let listItemCount: number | null = null
  let movieListItemCount: number | null = null
  let allVisibleListItemsRead = kind !== 'list'

  if (kind === 'work') {
    const workId = asString(material?.work?.id)
    const workTitle = asString(material?.work?.title)
    const workContent = workId ? contentById.get(workId) : null
    const picked = Array.isArray(material?.picked) ? material.picked : []
    const candidateRows = workId && movieContentIds.has(workId) ? (relationsByContent.get(workId) ?? []) : []
    for (const [slotIndex, pickedRow] of picked.entries()) {
      rawCount += 1
      const rid = asString(pickedRow?.rid)
      const celebId = asString(pickedRow?.id) ?? celebBySlug.get(asString(pickedRow?.slug) ?? '')?.id ?? null
      let resolved: Relation | null = null
      let reason = 'relation_not_found'
      const explicit = rid ? relationById.get(rid) : null
      if (explicit && (!workId || explicit.content_id === workId)) {
        resolved = explicit
      } else {
        const pair = relationForPair(celebId, workId)
        resolved = pair.relation
        reason = pair.reason ?? (explicit ? 'rid_content_mismatch' : 'relation_not_found')
      }
      if (!workId) reason = 'content_not_found'
      else if (!workContent) reason = 'content_not_found'
      else if (!movieContentIds.has(workId)) reason = 'not_movie'
      if (!resolved || !workId || !movieContentIds.has(workId) || resolved.content_id !== workId) {
        addUnknown(unknowns, orderIndex, articleName, kind, slotIndex + 1, reason, sourceOf({ rid, celebId, contentId: workId, slug: pickedRow?.slug, work: workTitle }))
        continue
      }
      matchedRawCount += 1
      pickedIds.add(resolved.id)
    }
    addCandidateRelations(orderIndex, articleName, candidateRows, pickedIds, relationIds)
  } else if (kind === 'person') {
    const slug = asString(material?.celeb?.slug)
    const celeb = slug ? celebBySlug.get(slug) : undefined
    const picked = Array.isArray(material?.picked) ? material.picked : []
    const candidateRows = celeb
      ? (relationsByCeleb.get(celeb.id) ?? []).filter((row) => movieContentIds.has(row.content_id))
      : []
    for (const [slotIndex, pickedRow] of picked.entries()) {
      rawCount += 1
      let contentId = asString(pickedRow?.id)
      let fallbackReason: string | undefined
      if (!contentId) {
        const fallback = titleFallback(pickedRow?.title)
        contentId = fallback.contentId
        fallbackReason = fallback.reason
      }
      const pair = relationForPair(celeb?.id ?? null, contentId)
      const resolved = pair.relation
      const reason = !celeb ? 'celeb_not_found' : fallbackReason ?? pair.reason ?? 'relation_not_found'
      if (!resolved || !contentId || !movieContentIds.has(contentId)) {
        addUnknown(unknowns, orderIndex, articleName, kind, slotIndex + 1, !movieContentIds.has(contentId ?? '') && contentId ? 'not_movie' : reason, sourceOf({ celebId: celeb?.id, contentId, slug, work: pickedRow?.title }))
        continue
      }
      matchedRawCount += 1
      pickedIds.add(resolved.id)
    }
    addCandidateRelations(orderIndex, articleName, candidateRows, pickedIds, relationIds)
  } else if (kind === 'list') {
    const slug = asString(material?.list?.slug)
    const list = slug ? listBySlug.get(slug) : undefined
    const visibleItems = list ? (visibleItemsByList.get(list.id) ?? []) : []
    const visibleMovieContentIds = new Set(visibleItems.map((item) => item.content_id).filter((id): id is string => !!id && movieContentIds.has(id)))
    listItemCount = list ? visibleItems.length : 0
    movieListItemCount = visibleMovieContentIds.size
    allVisibleListItemsRead = !!list
    const picked = Array.isArray(material?.picked) ? material.picked : []
    for (const [itemIndex, pickedItem] of picked.entries()) {
      const contentId = asString(pickedItem?.contentId)
      const voices = Array.isArray(pickedItem?.voices) ? pickedItem.voices : []
      for (const [voiceIndex, voice] of voices.entries()) {
        rawCount += 1
        const voiceSlug = asString(voice?.slug)
        const celeb = voiceSlug ? celebBySlug.get(voiceSlug) : undefined
        const pair = relationForPair(celeb?.id ?? null, contentId)
        const resolved = pair.relation
        const reason = !list ? 'list_not_found' : !contentId ? 'content_not_found' : !movieContentIds.has(contentId) ? 'not_movie' : !celeb ? 'celeb_not_found' : pair.reason ?? 'relation_not_found'
        if (!resolved || !contentId || !movieContentIds.has(contentId)) {
          addUnknown(unknowns, orderIndex, articleName, kind, `${itemIndex + 1}.${voiceIndex + 1}`, reason, sourceOf({ celebId: celeb?.id, contentId, slug: voiceSlug, work: pickedItem?.title }))
          continue
        }
        matchedRawCount += 1
        pickedIds.add(resolved.id)
      }
    }
    const candidateRows = [...visibleMovieContentIds]
      .flatMap((contentId) => relationsByContent.get(contentId) ?? [])
      .sort((a, b) => a.id.localeCompare(b.id))
    addCandidateRelations(orderIndex, articleName, candidateRows, pickedIds, relationIds)
  } else {
    const picked = material?.picked
    if (Array.isArray(picked)) rawCount = picked.length
    addUnknown(unknowns, orderIndex, articleName, kind, 0, 'material_shape_unknown', sourceOf({ work: articleName }))
  }

  const candidateCount = [...relationIds].filter((id) => usableReview(relationById.get(id)?.review, id)).length
  const pickedRelationCount = pickedIds.size
  const unmatchedCount = rawCount - matchedRawCount
  articleStats.push({
    orderIndex,
    name: articleName,
    kind,
    rawCount,
    matchedRawCount,
    unmatchedCount,
    pickedRelationCount,
    candidateCount,
    relationCount: relationIds.size,
    listItemCount,
    movieListItemCount,
    allVisibleListItemsRead,
    matched: unmatchedCount === 0 && relationIds.size > 0,
  })
}

const rows = [...inventory.values()].sort((a, b) => a.firstOrderIndex - b.firstOrderIndex || a.id.localeCompare(b.id))
const relationRawCount = articleStats.reduce((sum, row) => sum + row.relationCount, 0)
const pickedReferenceRawCount = articleStats.reduce((sum, row) => sum + row.rawCount, 0)
const pickedReferenceMatchedCount = articleStats.reduce((sum, row) => sum + row.matchedRawCount, 0)
const matchedArticleCount = articleStats.filter((row) => row.matched).length
const all240Matched = order.length === 240 && articleStats.length === 240 && matchedArticleCount === 240

const result = {
  generatedAt: new Date().toISOString(),
  basis: {
    orderFile: ORDER_FILE,
    relationTable: 'celeb_contents',
    moviePredicate: "contents.external_id startsWith 'tmdb-movie-'",
    listPredicate: 'curated_list_items.hidden === false',
    usableReview: 'lib/quality.mts: usableReview(review, id), default minLen=100',
    duplicateKey: 'celeb_contents.id',
    pickedBelowThresholdIncluded: true,
  },
  counts: {
    articleCount: order.length,
    matchedArticleCount,
    all240Matched,
    rawCount: relationRawCount,
    uniqueCount: rows.length,
    unmatchedCount: unknowns.length,
    pickedReferenceRawCount,
    pickedReferenceMatchedCount,
    currentPickedUniqueCount: rows.filter((row) => row.currentPicked).length,
    candidateUniqueCount: rows.filter((row) => row.usableReview).length,
    dbMovieRelationCount: relations.filter((row) => movieContentIds.has(row.content_id)).length,
    dbUsableMovieRelationCount: relations.filter((row) => movieContentIds.has(row.content_id) && usableReview(row.review, row.id)).length,
  },
  articles: articleStats,
  unknowns,
  rows,
}

fs.mkdirSync(CHANNEL_DIR, { recursive: true })
fs.writeFileSync(OUTPUT_FILE, `${JSON.stringify(result, null, 2)}\n`, 'utf8')

console.log(JSON.stringify({
  output: OUTPUT_FILE,
  articleCount: result.counts.articleCount,
  matchedArticleCount: result.counts.matchedArticleCount,
  all240Matched: result.counts.all240Matched,
  rawCount: result.counts.rawCount,
  uniqueCount: result.counts.uniqueCount,
  unmatchedCount: result.counts.unmatchedCount,
  pickedReferenceRawCount: result.counts.pickedReferenceRawCount,
  pickedReferenceMatchedCount: result.counts.pickedReferenceMatchedCount,
  currentPickedUniqueCount: result.counts.currentPickedUniqueCount,
  candidateUniqueCount: result.counts.candidateUniqueCount,
}, null, 2))
