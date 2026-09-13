'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/db/server'
import { requireAdmin } from '@/lib/admin-auth'
import { revalidateWebLists } from '@/lib/revalidate-web'
import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { CONTENT_TYPES } from '@/constants/contentTypes'
import { CURATOR_KINDS } from '@/constants/curated'

const PAGE_SIZE = 1_000

type DatabaseClient = Awaited<ReturnType<typeof createClient>>

export interface CuratedAdminCurator {
  id: string
  slug: string
  name: string
  nameEn: string | null
  kind: string
  country: string | null
  foundedYear: number | null
  description: string | null
  descriptionEn: string | null
  logoUrl: string | null
  homepageUrl: string | null
  sortOrder: number
  isFeatured: boolean
  listCount: number
}

export interface CuratedAdminList {
  id: string
  curatorId: string
  curatorName: string
  curatorSlug: string
  slug: string
  title: string
  titleEn: string | null
  description: string | null
  descriptionEn: string | null
  publishedYear: number | null
  edition: string | null
  seriesKey: string | null
  method: string | null
  methodEn: string | null
  sourceUrl: string
  coverImageUrl: string | null
  isRanked: boolean
  isAnnual: boolean
  contentType: string
  topics: string[]
  sortOrder: number
  isFeatured: boolean
  itemCount: number
  visibleItemCount: number
  linkedCount: number
  updatedAt: string
}

export interface CuratedAdminOverview {
  curators: CuratedAdminCurator[]
  lists: CuratedAdminList[]
  totals: {
    curatorCount: number
    listCount: number
    itemCount: number
    visibleItemCount: number
    linkedCount: number
    unlinkedCount: number
  }
}

export interface CuratedAdminContent {
  id: string
  type: string
  title: string
  titleEn: string | null
  creator: string | null
  thumbnailUrl: string | null
}

export interface CuratedAdminItem {
  id: string
  listId: string
  contentId: string | null
  rawTitle: string
  rawCreator: string | null
  rank: number | null
  year: number | null
  note: string | null
  noteEn: string | null
  hidden: boolean
  sortOrder: number
  content: CuratedAdminContent | null
}

export interface CuratedAdminListDetail {
  list: CuratedAdminList
  curator: CuratedAdminCurator
  items: CuratedAdminItem[]
}

export type CuratedContentSearchResult = CuratedAdminContent

export interface CuratorInput {
  slug: string
  name: string
  nameEn?: string | null
  kind: string
  country?: string | null
  foundedYear?: number | null
  description?: string | null
  descriptionEn?: string | null
  logoUrl?: string | null
  homepageUrl?: string | null
  sortOrder?: number | null
  isFeatured?: boolean
}

export interface CuratedListInput {
  curatorId: string
  slug: string
  title: string
  titleEn?: string | null
  description?: string | null
  descriptionEn?: string | null
  publishedYear?: number | null
  edition?: string | null
  seriesKey?: string | null
  method?: string | null
  methodEn?: string | null
  sourceUrl: string
  coverImageUrl?: string | null
  isRanked?: boolean
  isAnnual?: boolean
  contentType?: string
  topics?: string[]
  sortOrder?: number | null
  isFeatured?: boolean
}

export interface CuratedItemInput {
  listId: string
  contentId?: string | null
  rawTitle: string
  rawCreator?: string | null
  rank?: number | null
  year?: number | null
  note?: string | null
  noteEn?: string | null
  hidden?: boolean
  sortOrder?: number | null
}

export type CuratedActionResult<T = undefined> =
  | { success: true; data?: T }
  | { success: false; error: string }

interface CuratorRow {
  id: string
  slug: string
  name: string
  name_en: string | null
  kind: string
  country: string | null
  founded_year: number | null
  description: string | null
  description_en: string | null
  logo_url: string | null
  homepage_url: string | null
  sort_order: number
  is_featured: boolean
  created_at: string
  updated_at: string
}

interface ListRow {
  id: string
  curator_id: string
  slug: string
  title: string
  title_en: string | null
  description: string | null
  description_en: string | null
  published_year: number | null
  edition: string | null
  series_key: string | null
  method: string | null
  method_en: string | null
  source_url: string
  cover_image_url: string | null
  is_ranked: boolean
  is_annual: boolean
  content_type: string
  topics: string[] | null
  sort_order: number
  is_featured: boolean
  created_at: string
  updated_at: string
}

interface ItemCountRow {
  id: string
  list_id: string
  content_id: string | null
  hidden: boolean
}

interface ItemRow extends ItemCountRow {
  raw_title: string
  raw_creator: string | null
  rank: number | null
  year: number | null
  note: string | null
  note_en: string | null
  sort_order: number
}

interface ContentRow {
  id: string
  type: string
}

interface ContentLocaleRow {
  content_id: string
  locale: string
  title: string | null
  creator: string | null
  thumbnail_url: string | null
}

const CURATOR_COLUMNS =
  'id, slug, name, name_en, kind, country, founded_year, description, description_en, logo_url, homepage_url, sort_order, is_featured, created_at, updated_at'
const LIST_COLUMNS =
  'id, curator_id, slug, title, title_en, description, description_en, published_year, edition, series_key, method, method_en, source_url, cover_image_url, is_ranked, is_annual, content_type, topics, sort_order, is_featured, created_at, updated_at'

function asErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message
  }
  return fallback
}

function databaseError(error: unknown, fallback: string): string {
  if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
    return '같은 주소(slug)가 이미 있습니다.'
  }
  return asErrorMessage(error, fallback)
}

function text(value: string | null | undefined): string | null {
  const result = value?.trim() ?? ''
  return result || null
}

function requiredText(value: string | null | undefined, label: string): string {
  const result = value?.trim() ?? ''
  if (!result) throw new Error(`${label}을(를) 입력하세요.`)
  return result
}

function optionalInteger(value: number | null | undefined, label: string): number | null {
  if (value === null || value === undefined) return null
  if (!Number.isInteger(value)) throw new Error(`${label}은(는) 정수로 입력하세요.`)
  return value
}

function requiredHttpUrl(value: string | null | undefined, label: string): string {
  const result = requiredText(value, label)
  try {
    const url = new URL(result)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error()
  } catch {
    throw new Error(`${label}은(는) http 또는 https 주소여야 합니다.`)
  }
  return result
}

function optionalTopics(value: string[] | null | undefined): string[] {
  if (!Array.isArray(value)) return []
  return [...new Set(value.map((topic) => topic.trim()).filter(Boolean))]
}

function curatorFromRow(row: CuratorRow, listCount = 0): CuratedAdminCurator {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    nameEn: row.name_en,
    kind: row.kind,
    country: row.country,
    foundedYear: row.founded_year,
    description: row.description,
    descriptionEn: row.description_en,
    logoUrl: row.logo_url,
    homepageUrl: row.homepage_url,
    sortOrder: row.sort_order,
    isFeatured: row.is_featured,
    listCount,
  }
}

function listFromRow(
  row: ListRow,
  curator: CuratedAdminCurator | undefined,
  counts: { total: number; visible: number; linked: number } = { total: 0, visible: 0, linked: 0 },
): CuratedAdminList {
  return {
    id: row.id,
    curatorId: row.curator_id,
    curatorName: curator?.name ?? '기관 미상',
    curatorSlug: curator?.slug ?? '',
    slug: row.slug,
    title: row.title,
    titleEn: row.title_en,
    description: row.description,
    descriptionEn: row.description_en,
    publishedYear: row.published_year,
    edition: row.edition,
    seriesKey: row.series_key,
    method: row.method,
    methodEn: row.method_en,
    sourceUrl: row.source_url,
    coverImageUrl: row.cover_image_url,
    isRanked: row.is_ranked,
    isAnnual: row.is_annual,
    contentType: row.content_type,
    topics: Array.isArray(row.topics) ? row.topics : [],
    sortOrder: row.sort_order,
    isFeatured: row.is_featured,
    itemCount: counts.total,
    visibleItemCount: counts.visible,
    linkedCount: counts.linked,
    updatedAt: row.updated_at,
  }
}

async function fetchAllItemCountRows(db: DatabaseClient): Promise<ItemCountRow[]> {
  const rows: ItemCountRow[] = []
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await db
      .from('curated_list_items')
      .select('id, list_id, content_id, hidden')
      .order('id', { ascending: true })
      .range(from, from + PAGE_SIZE - 1)
    if (error) throw new Error(`선정 항목 조회 실패: ${error.message}`)
    const page = (data ?? []) as ItemCountRow[]
    rows.push(...page)
    if (page.length < PAGE_SIZE) break
  }
  return rows
}

async function fetchListItems(db: DatabaseClient, listId: string): Promise<ItemRow[]> {
  const rows: ItemRow[] = []
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await db
      .from('curated_list_items')
      .select('id, list_id, content_id, raw_title, raw_creator, rank, year, note, note_en, hidden, sort_order')
      .eq('list_id', listId)
      .order('sort_order', { ascending: true })
      .order('id', { ascending: true })
      .range(from, from + PAGE_SIZE - 1)
    if (error) throw new Error(`선정 항목 조회 실패: ${error.message}`)
    const page = (data ?? []) as ItemRow[]
    rows.push(...page)
    if (page.length < PAGE_SIZE) break
  }
  return rows
}

async function fetchContentMeta(
  db: DatabaseClient,
  contentIds: string[],
): Promise<{ contents: ContentRow[]; locales: ContentLocaleRow[] }> {
  const contents: ContentRow[] = []
  const locales: ContentLocaleRow[] = []
  for (let from = 0; from < contentIds.length; from += 300) {
    const ids = contentIds.slice(from, from + 300)
    const [contentResult, localeResult] = await Promise.all([
      db.from('contents').select('id, type').in('id', ids),
      db.from('content_locales').select('content_id, locale, title, creator, thumbnail_url').in('content_id', ids),
    ])
    if (contentResult.error) throw new Error(`연결 작품 조회 실패: ${contentResult.error.message}`)
    if (localeResult.error) throw new Error(`작품 판본 조회 실패: ${localeResult.error.message}`)
    contents.push(...((contentResult.data ?? []) as ContentRow[]))
    locales.push(...((localeResult.data ?? []) as ContentLocaleRow[]))
  }
  return { contents, locales }
}

function contentMapFromRows(contents: ContentRow[], locales: ContentLocaleRow[]): Map<string, CuratedAdminContent> {
  const localesByContent = new Map<string, ContentLocaleRow[]>()
  for (const locale of locales) {
    const current = localesByContent.get(locale.content_id)
    if (current) current.push(locale)
    else localesByContent.set(locale.content_id, [locale])
  }

  const map = new Map<string, CuratedAdminContent>()
  for (const content of contents) {
    const contentLocales = localesByContent.get(content.id) ?? []
    const preferred = contentLocales.find((locale) => locale.locale === 'ko')
      ?? contentLocales.find((locale) => locale.locale === 'en')
      ?? contentLocales[0]
    const english = contentLocales.find((locale) => locale.locale === 'en')
    map.set(content.id, {
      id: content.id,
      type: content.type,
      title: preferred?.title ?? '제목 없음',
      titleEn: english?.title ?? null,
      creator: preferred?.creator ?? null,
      thumbnailUrl: preferred?.thumbnail_url ?? english?.thumbnail_url ?? null,
    })
  }
  return map
}

function itemFromRow(row: ItemRow, contents: Map<string, CuratedAdminContent>): CuratedAdminItem {
  return {
    id: row.id,
    listId: row.list_id,
    contentId: row.content_id,
    rawTitle: row.raw_title,
    rawCreator: row.raw_creator,
    rank: row.rank,
    year: row.year,
    note: row.note,
    noteEn: row.note_en,
    hidden: row.hidden,
    sortOrder: row.sort_order,
    content: row.content_id ? contents.get(row.content_id) ?? null : null,
  }
}

async function nextSortOrder(db: DatabaseClient, table: 'curators' | 'curated_lists' | 'curated_list_items', scopeColumn?: string, scopeValue?: string): Promise<number> {
  let query = db.from(table).select('sort_order').order('sort_order', { ascending: false }).limit(1)
  if (scopeColumn && scopeValue) query = query.eq(scopeColumn, scopeValue)
  const { data, error } = await query.maybeSingle()
  if (error) throw error
  return ((data as { sort_order?: number } | null)?.sort_order ?? -1) + 1
}

async function refreshCuratedScreens(listId?: string): Promise<void> {
  revalidatePath('/curated')
  revalidatePath('/curated/[listId]', 'page')
  if (listId) revalidatePath(`/curated/${listId}`)
  await revalidateWebLists(CACHE_TAGS.CURATED)
}

async function listContentType(db: DatabaseClient, listId: string): Promise<string> {
  const { data, error } = await db.from('curated_lists').select('content_type').eq('id', listId).maybeSingle()
  if (error) throw error
  if (!data) throw new Error('목록을 찾을 수 없습니다.')
  return data.content_type
}

async function validateContentLink(db: DatabaseClient, contentId: string | null | undefined, expectedType: string): Promise<void> {
  if (!contentId) return
  const { data, error } = await db.from('contents').select('id, type').eq('id', contentId).maybeSingle()
  if (error) throw error
  if (!data) throw new Error('연결할 콘텐츠를 찾을 수 없습니다.')
  if (data.type !== expectedType) {
    throw new Error(`이 목록은 ${expectedType} 콘텐츠만 연결할 수 있습니다.`)
  }
}

export async function getCuratedAdminOverview(): Promise<CuratedAdminOverview> {
  await requireAdmin()
  const db = await createClient()
  const [curatorResult, listResult, itemRows] = await Promise.all([
    db.from('curators').select(CURATOR_COLUMNS).order('sort_order', { ascending: true }).order('name', { ascending: true }),
    db.from('curated_lists').select(LIST_COLUMNS).order('published_year', { ascending: false, nullsFirst: false }).order('sort_order', { ascending: true }).order('title', { ascending: true }),
    fetchAllItemCountRows(db),
  ])
  if (curatorResult.error) throw new Error(`선정 기관 조회 실패: ${curatorResult.error.message}`)
  if (listResult.error) throw new Error(`선정 목록 조회 실패: ${listResult.error.message}`)

  const curatorRows = (curatorResult.data ?? []) as CuratorRow[]
  const listRows = (listResult.data ?? []) as ListRow[]
  const countsByList = new Map<string, { total: number; visible: number; linked: number }>()
  for (const row of itemRows) {
    const counts = countsByList.get(row.list_id) ?? { total: 0, visible: 0, linked: 0 }
    counts.total += 1
    if (!row.hidden) counts.visible += 1
    if (row.content_id) counts.linked += 1
    countsByList.set(row.list_id, counts)
  }

  const listCountByCurator = new Map<string, number>()
  for (const list of listRows) listCountByCurator.set(list.curator_id, (listCountByCurator.get(list.curator_id) ?? 0) + 1)
  const curators = curatorRows.map((row) => curatorFromRow(row, listCountByCurator.get(row.id) ?? 0))
  const curatorMap = new Map(curators.map((curator) => [curator.id, curator]))
  const lists = listRows.map((row) => listFromRow(row, curatorMap.get(row.curator_id), countsByList.get(row.id)))

  return {
    curators,
    lists,
    totals: {
      curatorCount: curators.length,
      listCount: lists.length,
      itemCount: itemRows.length,
      visibleItemCount: itemRows.filter((item) => !item.hidden).length,
      linkedCount: itemRows.filter((item) => !!item.content_id).length,
      unlinkedCount: itemRows.filter((item) => !item.content_id).length,
    },
  }
}

export async function getCuratedAdminCurators(): Promise<CuratedAdminCurator[]> {
  await requireAdmin()
  const db = await createClient()
  const { data, error } = await db
    .from('curators')
    .select(CURATOR_COLUMNS)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })
  if (error) throw new Error(`선정 기관 조회 실패: ${error.message}`)
  return ((data ?? []) as CuratorRow[]).map((row) => curatorFromRow(row))
}

export async function getCuratedListAdminDetail(listId: string): Promise<CuratedAdminListDetail | null> {
  await requireAdmin()
  const db = await createClient()
  const [listResult, curatorResult, items] = await Promise.all([
    db.from('curated_lists').select(LIST_COLUMNS).eq('id', listId).maybeSingle(),
    db.from('curated_lists').select('curator_id').eq('id', listId).maybeSingle(),
    fetchListItems(db, listId),
  ])
  if (listResult.error) throw new Error(`선정 목록 조회 실패: ${listResult.error.message}`)
  if (curatorResult.error) throw new Error(`선정 기관 연결 조회 실패: ${curatorResult.error.message}`)
  if (!listResult.data) return null

  const list = listResult.data as ListRow
  const curatorId = (curatorResult.data as { curator_id?: string } | null)?.curator_id
  if (!curatorId) return null
  const [curatorLookup, curatorListCount] = await Promise.all([
    db.from('curators').select(CURATOR_COLUMNS).eq('id', curatorId).maybeSingle(),
    db.from('curated_lists').select('id', { count: 'exact', head: true }).eq('curator_id', curatorId),
  ])
  const { data: curatorData, error: curatorError } = curatorLookup
  if (curatorListCount.error) throw new Error(`선정 기관 목록 수 조회 실패: ${curatorListCount.error.message}`)
  if (curatorError) throw new Error(`선정 기관 조회 실패: ${curatorError.message}`)
  if (!curatorData) return null

  const curator = curatorFromRow(curatorData as CuratorRow, curatorListCount.count ?? 0)
  const counts = {
    total: items.length,
    visible: items.filter((item) => !item.hidden).length,
    linked: items.filter((item) => !!item.content_id).length,
  }
  const contentIds = [...new Set(items.map((item) => item.content_id).filter((id): id is string => !!id))]
  const { contents, locales } = await fetchContentMeta(db, contentIds)
  const contentMap = contentMapFromRows(contents, locales)

  return {
    list: listFromRow(list, curator, counts),
    curator,
    items: items.map((item) => itemFromRow(item, contentMap)),
  }
}

export async function searchCuratedContent(search: string, contentType?: string): Promise<CuratedContentSearchResult[]> {
  await requireAdmin()
  const db = await createClient()
  const term = search.trim()
  if (term.length < 2) return []
  const pattern = `%${term}%`
  const [titleResult, creatorResult] = await Promise.all([
    db.from('content_locales').select('content_id').ilike('title', pattern).limit(40),
    db.from('content_locales').select('content_id').ilike('creator', pattern).limit(40),
  ])
  if (titleResult.error) throw new Error(`콘텐츠 제목 검색 실패: ${titleResult.error.message}`)
  if (creatorResult.error) throw new Error(`콘텐츠 제작자 검색 실패: ${creatorResult.error.message}`)
  const ids = [...new Set([
    ...((titleResult.data ?? []) as { content_id: string }[]).map((row) => row.content_id),
    ...((creatorResult.data ?? []) as { content_id: string }[]).map((row) => row.content_id),
  ])]
  if (ids.length === 0) return []

  let contentQuery = db.from('contents').select('id, type').in('id', ids)
  if (contentType && CONTENT_TYPES.includes(contentType as (typeof CONTENT_TYPES)[number])) contentQuery = contentQuery.eq('type', contentType)
  const { data: contentData, error: contentError } = await contentQuery
  if (contentError) throw new Error(`콘텐츠 검색 결과 조회 실패: ${contentError.message}`)
  const contentRows = (contentData ?? []) as ContentRow[]
  if (contentRows.length === 0) return []
  const { data: localeData, error: localeError } = await db
    .from('content_locales')
    .select('content_id, locale, title, creator, thumbnail_url')
    .in('content_id', contentRows.map((row) => row.id))
  if (localeError) throw new Error(`콘텐츠 판본 조회 실패: ${localeError.message}`)
  const map = contentMapFromRows(contentRows, (localeData ?? []) as ContentLocaleRow[])
  return ids
    .map((id) => map.get(id))
    .filter((content): content is CuratedAdminContent => !!content)
    .map((content) => content)
}

export async function createCurator(input: CuratorInput): Promise<CuratedActionResult<{ id: string }>> {
  try {
    await requireAdmin()
    const db = await createClient()
    const kind = requiredText(input.kind, '기관 유형')
    if (!CURATOR_KINDS.includes(kind as (typeof CURATOR_KINDS)[number])) throw new Error('기관 유형이 올바르지 않습니다.')
    const sortOrder = input.sortOrder == null ? await nextSortOrder(db, 'curators') : optionalInteger(input.sortOrder, '정렬 순서') ?? 0
    const { data, error } = await db.from('curators').insert({
      slug: requiredText(input.slug, '기관 주소'),
      name: requiredText(input.name, '기관 이름'),
      name_en: text(input.nameEn),
      kind,
      country: text(input.country),
      founded_year: optionalInteger(input.foundedYear, '설립 연도'),
      description: text(input.description),
      description_en: text(input.descriptionEn),
      logo_url: text(input.logoUrl),
      homepage_url: text(input.homepageUrl),
      sort_order: sortOrder,
      is_featured: input.isFeatured ?? true,
    }).select('id').single()
    if (error) return { success: false, error: databaseError(error, '기관을 만들지 못했습니다.') }
    await refreshCuratedScreens()
    return { success: true, data: { id: data.id } }
  } catch (error) {
    return { success: false, error: asErrorMessage(error, '기관을 만들지 못했습니다.') }
  }
}

export async function updateCurator(id: string, input: CuratorInput): Promise<CuratedActionResult> {
  try {
    await requireAdmin()
    const db = await createClient()
    const kind = requiredText(input.kind, '기관 유형')
    if (!CURATOR_KINDS.includes(kind as (typeof CURATOR_KINDS)[number])) throw new Error('기관 유형이 올바르지 않습니다.')
    const { error } = await db.from('curators').update({
      slug: requiredText(input.slug, '기관 주소'),
      name: requiredText(input.name, '기관 이름'),
      name_en: text(input.nameEn),
      kind,
      country: text(input.country),
      founded_year: optionalInteger(input.foundedYear, '설립 연도'),
      description: text(input.description),
      description_en: text(input.descriptionEn),
      logo_url: text(input.logoUrl),
      homepage_url: text(input.homepageUrl),
      sort_order: optionalInteger(input.sortOrder, '정렬 순서') ?? 0,
      is_featured: input.isFeatured ?? false,
      updated_at: new Date().toISOString(),
    }).eq('id', id)
    if (error) return { success: false, error: databaseError(error, '기관을 저장하지 못했습니다.') }
    await refreshCuratedScreens()
    return { success: true }
  } catch (error) {
    return { success: false, error: asErrorMessage(error, '기관을 저장하지 못했습니다.') }
  }
}

export async function deleteCurator(id: string): Promise<CuratedActionResult> {
  try {
    await requireAdmin()
    const db = await createClient()
    const { count, error: countError } = await db.from('curated_lists').select('id', { count: 'exact', head: true }).eq('curator_id', id)
    if (countError) throw countError
    if ((count ?? 0) > 0) return { success: false, error: '목록이 있는 기관은 삭제할 수 없습니다. 목록을 먼저 정리하세요.' }
    const { error } = await db.from('curators').delete().eq('id', id)
    if (error) return { success: false, error: databaseError(error, '기관을 삭제하지 못했습니다.') }
    await refreshCuratedScreens()
    return { success: true }
  } catch (error) {
    return { success: false, error: asErrorMessage(error, '기관을 삭제하지 못했습니다.') }
  }
}

function listPayload(input: CuratedListInput) {
  const contentType = input.contentType ?? 'BOOK'
  if (!CONTENT_TYPES.includes(contentType as (typeof CONTENT_TYPES)[number])) throw new Error('콘텐츠 유형이 올바르지 않습니다.')
  return {
    curator_id: requiredText(input.curatorId, '기관'),
    slug: requiredText(input.slug, '목록 주소'),
    title: requiredText(input.title, '목록 이름'),
    title_en: text(input.titleEn),
    description: text(input.description),
    description_en: text(input.descriptionEn),
    published_year: optionalInteger(input.publishedYear, '발표 연도'),
    edition: text(input.edition),
    series_key: text(input.seriesKey),
    method: text(input.method),
    method_en: text(input.methodEn),
    source_url: requiredHttpUrl(input.sourceUrl, '원문 출처'),
    cover_image_url: text(input.coverImageUrl),
    is_ranked: input.isRanked ?? false,
    is_annual: input.isAnnual ?? false,
    content_type: contentType,
    topics: optionalTopics(input.topics),
    sort_order: input.sortOrder == null ? 0 : optionalInteger(input.sortOrder, '정렬 순서') ?? 0,
    is_featured: input.isFeatured ?? true,
  }
}

export async function createCuratedList(input: CuratedListInput): Promise<CuratedActionResult<{ id: string }>> {
  try {
    await requireAdmin()
    const db = await createClient()
    const payload = listPayload(input)
    const sortOrder = input.sortOrder == null ? await nextSortOrder(db, 'curated_lists', 'curator_id', payload.curator_id) : payload.sort_order
    const { data, error } = await db.from('curated_lists').insert({ ...payload, sort_order: sortOrder }).select('id').single()
    if (error) return { success: false, error: databaseError(error, '선정 목록을 만들지 못했습니다.') }
    await refreshCuratedScreens(data.id)
    return { success: true, data: { id: data.id } }
  } catch (error) {
    return { success: false, error: asErrorMessage(error, '선정 목록을 만들지 못했습니다.') }
  }
}

export async function updateCuratedList(id: string, input: CuratedListInput): Promise<CuratedActionResult> {
  try {
    await requireAdmin()
    const db = await createClient()
    const payload = listPayload(input)
    const { error } = await db.from('curated_lists').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', id)
    if (error) return { success: false, error: databaseError(error, '선정 목록을 저장하지 못했습니다.') }
    await refreshCuratedScreens(id)
    return { success: true }
  } catch (error) {
    return { success: false, error: asErrorMessage(error, '선정 목록을 저장하지 못했습니다.') }
  }
}

export async function deleteCuratedList(id: string): Promise<CuratedActionResult> {
  try {
    await requireAdmin()
    const db = await createClient()
    const { error } = await db.from('curated_lists').delete().eq('id', id)
    if (error) return { success: false, error: databaseError(error, '선정 목록을 삭제하지 못했습니다.') }
    await refreshCuratedScreens()
    return { success: true }
  } catch (error) {
    return { success: false, error: asErrorMessage(error, '선정 목록을 삭제하지 못했습니다.') }
  }
}

async function itemPayload(db: DatabaseClient, input: CuratedItemInput) {
  const listId = requiredText(input.listId, '목록')
  const contentType = await listContentType(db, listId)
  const contentId = text(input.contentId)
  await validateContentLink(db, contentId, contentType)
  return {
    list_id: listId,
    content_id: contentId,
    raw_title: requiredText(input.rawTitle, '원문 제목'),
    raw_creator: text(input.rawCreator),
    rank: optionalInteger(input.rank, '순위'),
    year: optionalInteger(input.year, '연도'),
    note: text(input.note),
    note_en: text(input.noteEn),
    hidden: input.hidden ?? false,
    sort_order: input.sortOrder == null ? await nextSortOrder(db, 'curated_list_items', 'list_id', listId) : optionalInteger(input.sortOrder, '정렬 순서') ?? 0,
  }
}

async function assertItemBelongsToList(db: DatabaseClient, itemId: string, listId: string): Promise<void> {
  const { data, error } = await db.from('curated_list_items').select('list_id').eq('id', itemId).maybeSingle()
  if (error) throw error
  if (!data) throw new Error('선정 항목을 찾을 수 없습니다.')
  if (data.list_id !== listId) throw new Error('선정 항목과 목록이 일치하지 않습니다.')
}

export async function createCuratedItem(input: CuratedItemInput): Promise<CuratedActionResult<{ id: string }>> {
  try {
    await requireAdmin()
    const db = await createClient()
    const payload = await itemPayload(db, input)
    const { data, error } = await db.from('curated_list_items').insert(payload).select('id').single()
    if (error) return { success: false, error: databaseError(error, '선정 항목을 만들지 못했습니다.') }
    await refreshCuratedScreens(payload.list_id)
    return { success: true, data: { id: data.id } }
  } catch (error) {
    return { success: false, error: asErrorMessage(error, '선정 항목을 만들지 못했습니다.') }
  }
}

export async function updateCuratedItem(id: string, input: CuratedItemInput): Promise<CuratedActionResult> {
  try {
    await requireAdmin()
    const db = await createClient()
    await assertItemBelongsToList(db, id, input.listId)
    const payload = await itemPayload(db, input)
    const { error } = await db.from('curated_list_items').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', id)
    if (error) return { success: false, error: databaseError(error, '선정 항목을 저장하지 못했습니다.') }
    await refreshCuratedScreens(payload.list_id)
    return { success: true }
  } catch (error) {
    return { success: false, error: asErrorMessage(error, '선정 항목을 저장하지 못했습니다.') }
  }
}

export async function deleteCuratedItem(id: string): Promise<CuratedActionResult> {
  try {
    await requireAdmin()
    const db = await createClient()
    const { data: item, error: itemError } = await db.from('curated_list_items').select('list_id').eq('id', id).maybeSingle()
    if (itemError) throw itemError
    if (!item) return { success: false, error: '선정 항목을 찾을 수 없습니다.' }
    const { error } = await db.from('curated_list_items').delete().eq('id', id)
    if (error) return { success: false, error: databaseError(error, '선정 항목을 삭제하지 못했습니다.') }
    await refreshCuratedScreens(item.list_id)
    return { success: true }
  } catch (error) {
    return { success: false, error: asErrorMessage(error, '선정 항목을 삭제하지 못했습니다.') }
  }
}
