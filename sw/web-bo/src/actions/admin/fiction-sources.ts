'use server'

import { revalidatePath } from 'next/cache'
import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { requireAdmin } from '@/lib/admin-auth'
import { revalidateWebItems } from '@/lib/revalidate-web'
import { createAdminClient } from '@/lib/db/admin'

export interface FictionSourceContentSummary {
  id: string
  type: string
  externalId: string | null
  externalSource: string | null
  recordCount: number
  title: string
  creator: string | null
  thumbnailUrl: string | null
  isbn: string | null
  hasEnglishAmazon: boolean
  editionCount: number
  activeProductCount: number
}

export interface FictionSourceProductAdminItem {
  id: number
  platform: 'coupang' | 'amazon'
  productId: string | null
  productUrl: string | null
  affiliateUrl: string
  qualityEvidence: string[]
  checkedAt: string | null
  isActive: boolean
}

export interface FictionSourceEditionAdminItem {
  id: number
  contentId: string
  locale: 'ko' | 'en'
  title: string
  creator: string | null
  description: string | null
  isbn: string | null
  publisher: string | null
  thumbnailUrl: string | null
  releaseDate: string | null
  editionKind: string | null
  textScope: string | null
  sortOrder: number
  verified: boolean | null
  products: FictionSourceProductAdminItem[]
}

export type FictionSourceRelationType = 'appearance' | 'related'

export interface FictionSourceCharacterAssignment {
  celebId: string
  relationType: FictionSourceRelationType
  sortOrder: number
  description: string | null
  descriptionEn: string | null
}

export interface FictionSourceAdminItem extends FictionSourceContentSummary {
  characterIds: string[]
  assignments: FictionSourceCharacterAssignment[]
  editions: FictionSourceEditionAdminItem[]
  updatedAt: string
}

export interface FictionCharacterOption {
  id: string
  slug: string
  nickname: string
  nicknameEn: string | null
  title: string | null
  avatarUrl: string | null
  status: string
}

export interface FictionSourceAdminData {
  sources: FictionSourceAdminItem[]
  characters: FictionCharacterOption[]
}

interface ContentRow {
  id: string
  type: string
  external_id: string | null
  external_source: string | null
  record_count: number | null
}

interface LocaleRow {
  content_id: string
  locale: string
  title: string | null
  creator: string | null
  thumbnail_url: string | null
  isbn: string | null
  affiliate_url: Array<{ platform?: string; url?: string }> | null
}

interface SourceRow {
  content_id: string
  updated_at: string
}

interface AssignmentRow {
  content_id: string
  celeb_id: string
  relation_type: string
  sort_order: number
  description: string | null
  description_en: string | null
}

interface EditionRow {
  id: number
  content_id: string
  locale: string
  title: string
  creator: string | null
  description: string | null
  isbn: string | null
  publisher: string | null
  thumbnail_url: string | null
  release_date: string | null
  edition_kind: string | null
  text_scope: string | null
  sort_order: number
  verified: boolean | null
}

interface ProductRow {
  id: number
  edition_id: number
  platform: string
  product_id: string | null
  product_url: string | null
  affiliate_url: string
  quality_evidence: unknown
  checked_at: string | null
  is_active: boolean
}

interface CharacterRow {
  id: string
  slug: string
  nickname: string | null
  nickname_en: string | null
  title: string | null
  avatar_url: string | null
  status: string
}

const ADMIN_PAGE_SIZE = 500

async function loadAllSources(): Promise<SourceRow[]> {
  const admin = createAdminClient()
  const rows: SourceRow[] = []
  for (let from = 0; ; from += ADMIN_PAGE_SIZE) {
    const { data, error } = await admin
      .from('figure_book_contents')
      .select('content_id,updated_at')
      .order('content_id')
      .range(from, from + ADMIN_PAGE_SIZE - 1)
    if (error) throw new Error(`인물 도서 목록 조회 실패: ${error.message}`)
    const page = (data ?? []) as SourceRow[]
    rows.push(...page)
    if (page.length < ADMIN_PAGE_SIZE) break
  }
  return rows.sort((a, b) => b.updated_at.localeCompare(a.updated_at))
}

async function loadAllAssignments(): Promise<AssignmentRow[]> {
  const admin = createAdminClient()
  const rows: AssignmentRow[] = []
  for (let from = 0; ; from += ADMIN_PAGE_SIZE) {
    const { data, error } = await admin
      .from('figure_book_characters')
      .select('content_id,celeb_id,relation_type,sort_order,description,description_en')
      .order('content_id')
      .order('sort_order')
      .order('celeb_id')
      .range(from, from + ADMIN_PAGE_SIZE - 1)
    if (error) throw new Error(`인물 도서 관계 조회 실패: ${error.message}`)
    const page = (data ?? []) as AssignmentRow[]
    rows.push(...page)
    if (page.length < ADMIN_PAGE_SIZE) break
  }
  return rows
}

async function loadAllEditions(): Promise<EditionRow[]> {
  const admin = createAdminClient()
  const rows: EditionRow[] = []
  for (let from = 0; ; from += ADMIN_PAGE_SIZE) {
    const { data, error } = await admin
      .from('figure_book_editions')
      .select('id,content_id,locale,title,creator,description,isbn,publisher,thumbnail_url,release_date,edition_kind,text_scope,sort_order,verified')
      .order('content_id')
      .order('locale')
      .order('sort_order')
      .order('id')
      .range(from, from + ADMIN_PAGE_SIZE - 1)
    if (error) throw new Error(`인물 도서 판본 조회 실패: ${error.message}`)
    const page = (data ?? []) as EditionRow[]
    rows.push(...page)
    if (page.length < ADMIN_PAGE_SIZE) break
  }
  return rows
}

async function loadAllProducts(): Promise<ProductRow[]> {
  const admin = createAdminClient()
  const rows: ProductRow[] = []
  for (let from = 0; ; from += ADMIN_PAGE_SIZE) {
    const { data, error } = await admin
      .from('figure_book_products')
      .select('id,edition_id,platform,product_id,product_url,affiliate_url,quality_evidence,checked_at,is_active')
      .order('edition_id')
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .range(from, from + ADMIN_PAGE_SIZE - 1)
    if (error) throw new Error(`인물 도서 상품 조회 실패: ${error.message}`)
    const page = (data ?? []) as ProductRow[]
    rows.push(...page)
    if (page.length < ADMIN_PAGE_SIZE) break
  }
  return rows
}

async function loadAllCharacters(): Promise<CharacterRow[]> {
  const admin = createAdminClient()
  const rows: CharacterRow[] = []
  for (let from = 0; ; from += ADMIN_PAGE_SIZE) {
    const { data, error } = await admin
      .from('celebs')
      .select('id,slug,nickname,nickname_en,title,avatar_url,status:publication_status')
      .neq('publication_status', 'deleted')
      .order('nickname')
      .order('id')
      .range(from, from + ADMIN_PAGE_SIZE - 1)
    if (error) throw new Error(`인물 목록 조회 실패: ${error.message}`)
    const page = (data ?? []) as CharacterRow[]
    rows.push(...page)
    if (page.length < ADMIN_PAGE_SIZE) break
  }
  return rows
}

function summarizeContents(
  contents: ContentRow[],
  locales: LocaleRow[],
): FictionSourceContentSummary[] {
  const localesByContent = new Map<string, LocaleRow[]>()
  for (const locale of locales) {
    const rows = localesByContent.get(locale.content_id) ?? []
    rows.push(locale)
    localesByContent.set(locale.content_id, rows)
  }

  return contents.map((content) => {
    const editions = localesByContent.get(content.id) ?? []
    const ko = editions.find((edition) => edition.locale === 'ko')
    const en = editions.find((edition) => edition.locale === 'en')
    const primary = ko ?? en

    return {
      id: content.id,
      type: content.type,
      externalId: content.external_id,
      externalSource: content.external_source,
      recordCount: content.record_count ?? 0,
      title: primary?.title?.trim() || content.external_id || content.id,
      creator: primary?.creator?.trim() || null,
      thumbnailUrl: primary?.thumbnail_url || en?.thumbnail_url || null,
      isbn: primary?.isbn || null,
      hasEnglishAmazon: false,
      editionCount: 0,
      activeProductCount: 0,
    }
  })
}

async function loadContentSummaries(
  contentIds: string[],
): Promise<FictionSourceContentSummary[]> {
  if (contentIds.length === 0) return []

  const admin = createAdminClient()
  const contents: ContentRow[] = []
  const locales: LocaleRow[] = []

  // .in() URL 길이 한계를 피한다. 인물 도서가 늘어도 200개씩 고정한다.
  for (let from = 0; from < contentIds.length; from += 200) {
    const ids = contentIds.slice(from, from + 200)
    const [contentResult, localeResult] = await Promise.all([
      admin
        .from('contents')
        .select('id,type,external_id,external_source,record_count')
        .in('id', ids),
      admin
        .from('content_locales')
        .select('content_id,locale,title,creator,thumbnail_url,isbn,affiliate_url')
        .in('content_id', ids),
    ])

    if (contentResult.error) {
      throw new Error(`인물 도서 콘텐츠 조회 실패: ${contentResult.error.message}`)
    }
    if (localeResult.error) {
      throw new Error(`인물 도서 locale 조회 실패: ${localeResult.error.message}`)
    }

    contents.push(...((contentResult.data ?? []) as ContentRow[]))
    locales.push(...((localeResult.data ?? []) as LocaleRow[]))
  }

  return summarizeContents(contents, locales)
}

export async function getFictionSourceAdminData(): Promise<FictionSourceAdminData> {
  await requireAdmin()
  const [sourceRows, assignmentRows, characterRows, editionRows, productRows] = await Promise.all([
    loadAllSources(),
    loadAllAssignments(),
    loadAllCharacters(),
    loadAllEditions(),
    loadAllProducts(),
  ])
  const summaries = await loadContentSummaries(
    sourceRows.map((row) => row.content_id),
  )
  const summaryById = new Map(summaries.map((summary) => [summary.id, summary]))
  const assignmentsByContent = new Map<string, FictionSourceCharacterAssignment[]>()
  const productsByEdition = new Map<number, FictionSourceProductAdminItem[]>()
  for (const product of productRows) {
    if (product.platform !== 'coupang' && product.platform !== 'amazon') continue
    const current = productsByEdition.get(product.edition_id) ?? []
    current.push({
      id: product.id,
      platform: product.platform,
      productId: product.product_id,
      productUrl: product.product_url,
      affiliateUrl: product.affiliate_url,
      qualityEvidence: Array.isArray(product.quality_evidence)
        ? product.quality_evidence.filter((value): value is string => typeof value === 'string')
        : [],
      checkedAt: product.checked_at,
      isActive: product.is_active,
    })
    productsByEdition.set(product.edition_id, current)
  }

  const editionsByContent = new Map<string, FictionSourceEditionAdminItem[]>()
  for (const edition of editionRows) {
    if (edition.locale !== 'ko' && edition.locale !== 'en') continue
    const current = editionsByContent.get(edition.content_id) ?? []
    current.push({
      id: edition.id,
      contentId: edition.content_id,
      locale: edition.locale,
      title: edition.title,
      creator: edition.creator,
      description: edition.description,
      isbn: edition.isbn,
      publisher: edition.publisher,
      thumbnailUrl: edition.thumbnail_url,
      releaseDate: edition.release_date,
      editionKind: edition.edition_kind,
      textScope: edition.text_scope,
      sortOrder: edition.sort_order,
      verified: edition.verified,
      products: productsByEdition.get(edition.id) ?? [],
    })
    editionsByContent.set(edition.content_id, current)
  }

  for (const assignment of assignmentRows) {
    if (assignment.relation_type !== 'appearance' && assignment.relation_type !== 'related') {
      throw new Error(`지원하지 않는 인물 도서 관계입니다: ${assignment.relation_type}`)
    }
    const contentId = assignment.content_id
    const current = assignmentsByContent.get(contentId) ?? []
    current.push({
      celebId: assignment.celeb_id,
      relationType: assignment.relation_type,
      sortOrder: assignment.sort_order,
      description: assignment.description?.trim() || null,
      descriptionEn: assignment.description_en?.trim() || null,
    })
    assignmentsByContent.set(contentId, current)
  }

  const sources = sourceRows.flatMap((row): FictionSourceAdminItem[] => {
    const summary = summaryById.get(row.content_id)
    if (!summary) return []
    const assignments = assignmentsByContent.get(summary.id) ?? []
    const editions = editionsByContent.get(summary.id) ?? []
    const activeProducts = editions.flatMap((edition) => (
      edition.products.filter((product) => product.isActive)
    ))
    return [{
      ...summary,
      hasEnglishAmazon: editions.some((edition) => (
        edition.locale === 'en'
        && edition.products.some((product) => product.isActive && product.platform === 'amazon')
      )),
      editionCount: editions.length,
      activeProductCount: activeProducts.length,
      characterIds: assignments.map((assignment) => assignment.celebId),
      assignments,
      editions,
      updatedAt: row.updated_at,
    }]
  })

  const characters: FictionCharacterOption[] = characterRows.map((row) => ({
    id: row.id,
    slug: row.slug,
    nickname: row.nickname ?? row.slug,
    nicknameEn: row.nickname_en,
    title: row.title,
    avatarUrl: row.avatar_url,
    status: row.status,
  }))

  return { sources, characters }
}

export async function searchFictionSourceCandidates(
  rawQuery: string,
): Promise<FictionSourceContentSummary[]> {
  await requireAdmin()
  const query = rawQuery.trim().slice(0, 80)
  if (query.length < 2) return []

  const admin = createAdminClient()
  const pattern = `%${query}%`
  const [titleResult, creatorResult, externalResult] = await Promise.all([
    admin
      .from('content_locales')
      .select('content_id')
      .ilike('title', pattern)
      .limit(20),
    admin
      .from('content_locales')
      .select('content_id')
      .ilike('creator', pattern)
      .limit(20),
    admin
      .from('contents')
      .select('id')
      .ilike('external_id', pattern)
      .limit(20),
  ])

  if (titleResult.error) throw new Error(`콘텐츠 제목 검색 실패: ${titleResult.error.message}`)
  if (creatorResult.error) throw new Error(`콘텐츠 창작자 검색 실패: ${creatorResult.error.message}`)
  if (externalResult.error) throw new Error(`콘텐츠 외부 ID 검색 실패: ${externalResult.error.message}`)

  const contentIds = [...new Set([
    ...(titleResult.data ?? []).map((row) => row.content_id as string),
    ...(creatorResult.data ?? []).map((row) => row.content_id as string),
    ...(externalResult.data ?? []).map((row) => row.id as string),
  ])].slice(0, 30)

  const summaries = await loadContentSummaries(contentIds)
  return summaries.filter((summary) => summary.type === 'BOOK').sort((a, b) => (
    b.recordCount - a.recordCount
    || a.title.localeCompare(b.title, 'ko')
  ))
}

export async function saveFictionSource(input: {
  contentId: string
  relations: Array<{
    celebId: string
    relationType: FictionSourceRelationType
  }>
}): Promise<void> {
  await requireAdmin()
  const contentId = input.contentId.trim()
  const relations = input.relations.map((relation) => ({
    celebId: relation.celebId.trim(),
    relationType: relation.relationType,
  }))
  const celebIds = relations.map((relation) => relation.celebId)

  if (!contentId) throw new Error('대표 콘텐츠 ID가 필요합니다')
  if (celebIds.some((id) => !id)) throw new Error('비어 있는 인물 ID가 포함되어 있습니다')
  if (new Set(celebIds).size !== celebIds.length) {
    throw new Error('동일한 인물을 한 도서에 중복 연결할 수 없습니다')
  }
  if (relations.some((relation) => (
    relation.relationType !== 'appearance' && relation.relationType !== 'related'
  ))) {
    throw new Error('관계는 등장 도서 또는 연관 도서여야 합니다')
  }

  const admin = createAdminClient()
  const { data: previous, error: previousError } = await admin
    .from('figure_book_characters')
    .select('celeb_id')
    .eq('content_id', contentId)
  if (previousError) throw new Error(`기존 인물 도서 관계 조회 실패: ${previousError.message}`)

  const { error } = await admin.rpc('set_figure_book_relations', {
    p_content_id: contentId,
    p_relations: relations.map((relation, sortOrder) => ({
      celeb_id: relation.celebId,
      relation_type: relation.relationType,
      sort_order: sortOrder,
    })),
  })
  if (error) throw new Error(`인물 도서 저장 실패: ${error.message}`)

  const affectedCelebIds = [...new Set([...(previous ?? []).map((row) => row.celeb_id), ...celebIds])]
  const { data: celebs, error: celebsError } = affectedCelebIds.length > 0
    ? await admin.from('celebs').select('id, slug').in('id', affectedCelebIds)
    : { data: [], error: null }
  if (celebsError) throw new Error(`인물 slug 조회 실패: ${celebsError.message}`)

  revalidatePath('/fiction-sources')
  revalidatePath(`/contents/${contentId}`)
  await revalidateWebItems(
    [
      { domain: CACHE_TAGS.CONTENTS, id: contentId },
      ...affectedCelebIds.map((id) => ({ domain: CACHE_TAGS.CELEBS, id })),
      ...(celebs ?? []).flatMap((celeb) => (
        celeb.slug ? [{ domain: CACHE_TAGS.CELEBS, id: celeb.slug }] : []
      )),
    ],
    [CACHE_TAGS.FICTION_SOURCES, CACHE_TAGS.CELEBS, CACHE_TAGS.CONTENTS],
  )
}

export async function saveFictionSourceCharacterDescription(input: {
  contentId: string
  celebId: string
  description: string
  descriptionEn: string
}): Promise<void> {
  await requireAdmin()
  const contentId = input.contentId.trim()
  const celebId = input.celebId.trim()
  const description = input.description.trim() || null
  const descriptionEn = input.descriptionEn.trim() || null

  if (!contentId) throw new Error('대표 콘텐츠 ID가 필요합니다')
  if (!celebId) throw new Error('인물 ID가 필요합니다')

  const admin = createAdminClient()
  if (descriptionEn) {
    const { data: englishEdition, error: englishEditionError } = await admin
      .from('figure_book_purchase_options')
      .select('edition_id')
      .eq('content_id', contentId)
      .eq('locale', 'en')
      .eq('platform', 'amazon')
      .limit(1)
      .maybeSingle()
    if (englishEditionError) {
      throw new Error(`영문판 구매 링크 조회 실패: ${englishEditionError.message}`)
    }
    if (!englishEdition) {
      throw new Error('영어 등장 설명은 실제 영문판의 Amazon 링크를 먼저 등록해야 저장할 수 있습니다')
    }
  }
  const [currentResult, celebResult] = await Promise.all([
    admin
      .from('figure_book_characters')
      .select('relation_type,description,description_en')
      .eq('content_id', contentId)
      .eq('celeb_id', celebId)
      .maybeSingle(),
    admin
      .from('celebs')
      .select('slug')
      .eq('id', celebId)
      .maybeSingle(),
  ])
  if (currentResult.error) {
    throw new Error(`기존 등장 설명 조회 실패: ${currentResult.error.message}`)
  }
  if (!currentResult.data) throw new Error('저장할 인물 도서 관계를 찾을 수 없습니다')
  if (currentResult.data.relation_type === 'related') {
    throw new Error('연관 도서에는 작품 속 등장 설명을 저장할 수 없습니다')
  }
  if (currentResult.data.relation_type !== 'appearance') {
    throw new Error(`지원하지 않는 인물 도서 관계입니다: ${currentResult.data.relation_type}`)
  }
  if (celebResult.error) {
    throw new Error(`인물 slug 조회 실패: ${celebResult.error.message}`)
  }

  const currentDescription = currentResult.data.description?.trim() || null
  const currentDescriptionEn = currentResult.data.description_en?.trim() || null
  if (currentDescription === description && currentDescriptionEn === descriptionEn) return

  const { data: updated, error: updateError } = await admin
    .from('figure_book_characters')
    .update({ description, description_en: descriptionEn })
    .eq('content_id', contentId)
    .eq('celeb_id', celebId)
    .select('celeb_id')
    .maybeSingle()
  if (updateError) throw new Error(`등장 설명 저장 실패: ${updateError.message}`)
  if (!updated) throw new Error('저장할 인물 도서 관계를 찾을 수 없습니다')

  revalidatePath('/fiction-sources')
  revalidatePath(`/contents/${contentId}`)
  try {
    await revalidateWebItems(
      [
        { domain: CACHE_TAGS.CONTENTS, id: contentId },
        { domain: CACHE_TAGS.CELEBS, id: celebId },
        ...(celebResult.data?.slug
          ? [{ domain: CACHE_TAGS.CELEBS, id: celebResult.data.slug }]
          : []),
      ],
      [CACHE_TAGS.FICTION_SOURCES, CACHE_TAGS.CELEBS, CACHE_TAGS.CONTENTS],
    )
  } catch {
    // 운영 DB 트리거도 같은 태그를 무효화한다. 저장 성공을 캐시 호출 실패로 되돌리지 않는다.
  }
}

const EDITION_KINDS = new Set([
  'full',
  'abridged',
  'retelling',
  'adaptation',
  'selection',
  'volume',
])

function nullableText(value: string): string | null {
  return value.trim() || null
}

function validateEditionInput(input: {
  contentId: string
  locale: string
  title: string
  isbn: string
  releaseDate: string
  editionKind: string
  sortOrder: number
}) {
  if (!input.contentId.trim()) throw new Error('인물 도서 작품 ID가 필요합니다')
  if (input.locale !== 'ko' && input.locale !== 'en') throw new Error('판본 언어는 ko 또는 en이어야 합니다')
  if (!input.title.trim()) throw new Error('판본 제목이 필요합니다')
  const isbn = input.isbn.replace(/[\s-]/g, '')
  if (!/^(?:97[89]\d{10}|\d{9}[\dXx])$/.test(isbn)) {
    throw new Error('정확한 판본을 구별할 ISBN-10 또는 ISBN-13이 필요합니다')
  }
  if (input.releaseDate && !/^\d{4}-\d{2}-\d{2}$/.test(input.releaseDate)) {
    throw new Error('출간일은 YYYY-MM-DD 형식이어야 합니다')
  }
  if (input.editionKind && !EDITION_KINDS.has(input.editionKind)) {
    throw new Error('지원하지 않는 판본 성격입니다')
  }
  if (!Number.isInteger(input.sortOrder) || input.sortOrder < 0) {
    throw new Error('판본 순서는 0 이상의 정수여야 합니다')
  }
  return isbn
}

async function revalidateSourceCatalog(contentId: string) {
  revalidatePath('/fiction-sources')
  revalidatePath(`/contents/${contentId}`)
  await revalidateWebItems(
    [{ domain: CACHE_TAGS.CONTENTS, id: contentId }],
    [CACHE_TAGS.FICTION_SOURCES],
  )
}

export async function saveFictionSourceEdition(input: {
  editionId?: number
  contentId: string
  locale: string
  title: string
  creator: string
  description: string
  isbn: string
  publisher: string
  thumbnailUrl: string
  releaseDate: string
  editionKind: string
  textScope: string
  sortOrder: number
  verified: boolean
}): Promise<void> {
  await requireAdmin()
  const contentId = input.contentId.trim()
  const isbn = validateEditionInput({ ...input, contentId })
  const admin = createAdminClient()
  const mutable = {
    title: input.title.trim(),
    creator: nullableText(input.creator),
    description: nullableText(input.description),
    publisher: nullableText(input.publisher),
    thumbnail_url: nullableText(input.thumbnailUrl),
    release_date: nullableText(input.releaseDate),
    edition_kind: nullableText(input.editionKind),
    text_scope: nullableText(input.textScope),
    sort_order: input.sortOrder,
    verified: input.verified,
  }

  if (input.editionId) {
    const { data: current, error: currentError } = await admin
      .from('figure_book_editions')
      .select('id,content_id,locale,isbn')
      .eq('id', input.editionId)
      .maybeSingle()
    if (currentError) throw new Error(`기존 판본 조회 실패: ${currentError.message}`)
    if (!current) throw new Error('수정할 판본을 찾을 수 없습니다')
    if (current.content_id !== contentId || current.locale !== input.locale || current.isbn !== isbn) {
      throw new Error('작품·언어·ISBN은 판본의 항구적 식별자입니다. 다른 판본은 새로 추가하세요')
    }

    const { error } = await admin
      .from('figure_book_editions')
      .update(mutable)
      .eq('id', input.editionId)
    if (error) throw new Error(`판본 수정 실패: ${error.message}`)
  } else {
    const { error } = await admin
      .from('figure_book_editions')
      .insert({
        content_id: contentId,
        locale: input.locale,
        isbn,
        ...mutable,
      })
    if (error?.code === '23505') throw new Error('이 작품에 같은 언어·ISBN 판본이 이미 있습니다')
    if (error) throw new Error(`판본 추가 실패: ${error.message}`)
  }

  await revalidateSourceCatalog(contentId)
}

function validateProductInput(input: {
  platform: string
  productId: string
  productUrl: string
  affiliateUrl: string
  qualityEvidence: string[]
}) {
  if (input.platform !== 'coupang' && input.platform !== 'amazon') {
    throw new Error('판매처는 coupang 또는 amazon이어야 합니다')
  }
  if (!input.productId.trim()) throw new Error('상품 ID가 필요합니다')
  if (!input.productUrl.startsWith('https://')) throw new Error('HTTPS 상품 주소가 필요합니다')
  if (!input.affiliateUrl.startsWith('https://')) throw new Error('HTTPS 제휴 주소가 필요합니다')
  const evidence = input.qualityEvidence.map((value) => value.trim()).filter(Boolean)
  if (evidence.length === 0) throw new Error('상품 화면에서 확인한 품질 근거가 필요합니다')
  if (input.platform === 'coupang') {
    if (!/^\d+$/.test(input.productId)) throw new Error('쿠팡 상품 ID는 숫자여야 합니다')
    if (!/^https:\/\/(?:www\.)?coupang\.com\/vp\/products\/\d+/.test(input.productUrl)) {
      throw new Error('쿠팡 상품 상세 주소가 올바르지 않습니다')
    }
    const urlProductId = new URL(input.productUrl).pathname.match(/\/vp\/products\/(\d+)/)?.[1]
    if (urlProductId !== input.productId) {
      throw new Error('쿠팡 상품 ID와 상품 상세 주소의 상품 번호가 다릅니다')
    }
    if (!/^https:\/\/link\.coupang\.com\/a\/[A-Za-z0-9]+\/?$/.test(input.affiliateUrl)) {
      throw new Error('쿠팡 파트너스 단축 주소가 올바르지 않습니다')
    }
    if (!evidence.some((value) => /badge|배지|뱃지|로켓\s*배송|도착\s*보장/i.test(value))) {
      throw new Error('쿠팡 상품에는 로켓배송·도착 보장 같은 배송 배지 근거가 필요합니다')
    }
  }
  return evidence
}

export async function replaceFictionSourceProduct(input: {
  editionId: number
  platform: string
  productId: string
  productUrl: string
  affiliateUrl: string
  qualityEvidence: string[]
}): Promise<void> {
  await requireAdmin()
  if (!Number.isInteger(input.editionId) || input.editionId <= 0) {
    throw new Error('판본 ID가 올바르지 않습니다')
  }
  const evidence = validateProductInput(input)
  const admin = createAdminClient()
  const { data: edition, error: editionError } = await admin
    .from('figure_book_editions')
    .select('content_id,locale')
    .eq('id', input.editionId)
    .maybeSingle()
  if (editionError) throw new Error(`판본 조회 실패: ${editionError.message}`)
  if (!edition) throw new Error('상품을 연결할 판본을 찾을 수 없습니다')
  const expectedPlatform = edition.locale === 'en' ? 'amazon' : 'coupang'
  if (input.platform !== expectedPlatform) {
    throw new Error(`${edition.locale} 판본의 판매처는 ${expectedPlatform}이어야 합니다`)
  }

  const { error } = await admin.rpc('replace_figure_book_product', {
    p_edition_id: input.editionId,
    p_platform: input.platform,
    p_product_id: input.productId.trim(),
    p_product_url: input.productUrl.trim(),
    p_affiliate_url: input.affiliateUrl.trim(),
    p_quality_evidence: evidence,
    p_checked_at: new Date().toISOString(),
  })
  if (error) throw new Error(`판본 상품 교체 실패: ${error.message}`)
  await revalidateSourceCatalog(edition.content_id)
}

export async function deactivateFictionSourceProduct(input: {
  editionId: number
  platform: string
}): Promise<void> {
  await requireAdmin()
  if (input.platform !== 'coupang' && input.platform !== 'amazon') {
    throw new Error('판매처는 coupang 또는 amazon이어야 합니다')
  }
  const admin = createAdminClient()
  const { data: edition, error: editionError } = await admin
    .from('figure_book_editions')
    .select('content_id')
    .eq('id', input.editionId)
    .maybeSingle()
  if (editionError) throw new Error(`판본 조회 실패: ${editionError.message}`)
  if (!edition) throw new Error('상품을 해제할 판본을 찾을 수 없습니다')

  const { error } = await admin.rpc('deactivate_figure_book_product', {
    p_edition_id: input.editionId,
    p_platform: input.platform,
  })
  if (error) throw new Error(`판본 상품 해제 실패: ${error.message}`)
  await revalidateSourceCatalog(edition.content_id)
}

export async function removeFictionSource(contentId: string): Promise<void> {
  await requireAdmin()
  const id = contentId.trim()
  if (!id) throw new Error('대표 콘텐츠 ID가 필요합니다')

  const admin = createAdminClient()
  const { data: previous, error: previousError } = await admin
    .from('figure_book_characters')
    .select('celeb_id')
    .eq('content_id', id)
  if (previousError) throw new Error(`기존 인물 도서 관계 조회 실패: ${previousError.message}`)

  const { error } = await admin
    .from('figure_book_contents')
    .delete()
    .eq('content_id', id)
  if (error) throw new Error(`인물 도서 지정 해제 실패: ${error.message}`)

  const affectedCelebIds = [...new Set((previous ?? []).map((row) => row.celeb_id))]
  const { data: celebs, error: celebsError } = affectedCelebIds.length > 0
    ? await admin.from('celebs').select('id, slug').in('id', affectedCelebIds)
    : { data: [], error: null }
  if (celebsError) throw new Error(`인물 slug 조회 실패: ${celebsError.message}`)

  revalidatePath('/fiction-sources')
  revalidatePath(`/contents/${id}`)
  await revalidateWebItems(
    [
      { domain: CACHE_TAGS.CONTENTS, id },
      ...affectedCelebIds.map((celebId) => ({ domain: CACHE_TAGS.CELEBS, id: celebId })),
      ...(celebs ?? []).flatMap((celeb) => (
        celeb.slug ? [{ domain: CACHE_TAGS.CELEBS, id: celeb.slug }] : []
      )),
    ],
    [CACHE_TAGS.FICTION_SOURCES, CACHE_TAGS.CELEBS, CACHE_TAGS.CONTENTS],
  )
}
