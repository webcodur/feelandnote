'use server'

import { revalidatePath } from 'next/cache'
import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { requireAdmin } from '@/lib/admin-auth'
import { revalidateWebItems } from '@/lib/revalidate-web'
import { createAdminClient } from '@/lib/supabase/admin'

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
}

export interface FictionSourceCharacterAssignment {
  celebId: string
  sortOrder: number
  description: string | null
  descriptionEn: string | null
}

export interface FictionSourceAdminItem extends FictionSourceContentSummary {
  characterIds: string[]
  assignments: FictionSourceCharacterAssignment[]
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
  sort_order: number
  description: string | null
  description_en: string | null
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
      .from('fiction_source_contents')
      .select('content_id,updated_at')
      .order('content_id')
      .range(from, from + ADMIN_PAGE_SIZE - 1)
    if (error) throw new Error(`대표 원전 목록 조회 실패: ${error.message}`)
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
      .from('fiction_source_characters')
      .select('content_id,celeb_id,sort_order,description,description_en')
      .order('content_id')
      .order('sort_order')
      .order('celeb_id')
      .range(from, from + ADMIN_PAGE_SIZE - 1)
    if (error) throw new Error(`대표 원전 인물 연결 조회 실패: ${error.message}`)
    const page = (data ?? []) as AssignmentRow[]
    rows.push(...page)
    if (page.length < ADMIN_PAGE_SIZE) break
  }
  return rows
}

async function loadAllFictionCharacters(): Promise<CharacterRow[]> {
  const admin = createAdminClient()
  const rows: CharacterRow[] = []
  for (let from = 0; ; from += ADMIN_PAGE_SIZE) {
    const { data, error } = await admin
      .from('celebs')
      .select('id,slug,nickname,nickname_en,title,avatar_url,status:publication_status')
      .eq('celeb_tier', 'fiction')
      .order('nickname')
      .order('id')
      .range(from, from + ADMIN_PAGE_SIZE - 1)
    if (error) throw new Error(`픽션 인물 목록 조회 실패: ${error.message}`)
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
      hasEnglishAmazon: Boolean(en?.affiliate_url?.some(
        (link) => link.platform === 'amazon' && link.url?.trim(),
      )),
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

  // .in() URL 길이 한계를 피한다. 대표 원전이 늘어도 200개씩 고정한다.
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
      throw new Error(`대표 원전 콘텐츠 조회 실패: ${contentResult.error.message}`)
    }
    if (localeResult.error) {
      throw new Error(`대표 원전 판본 조회 실패: ${localeResult.error.message}`)
    }

    contents.push(...((contentResult.data ?? []) as ContentRow[]))
    locales.push(...((localeResult.data ?? []) as LocaleRow[]))
  }

  return summarizeContents(contents, locales)
}

export async function getFictionSourceAdminData(): Promise<FictionSourceAdminData> {
  await requireAdmin()
  const [sourceRows, assignmentRows, characterRows] = await Promise.all([
    loadAllSources(),
    loadAllAssignments(),
    loadAllFictionCharacters(),
  ])
  const summaries = await loadContentSummaries(
    sourceRows.map((row) => row.content_id),
  )
  const summaryById = new Map(summaries.map((summary) => [summary.id, summary]))
  const assignmentsByContent = new Map<string, FictionSourceCharacterAssignment[]>()

  for (const assignment of assignmentRows) {
    const contentId = assignment.content_id
    const current = assignmentsByContent.get(contentId) ?? []
    current.push({
      celebId: assignment.celeb_id,
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
    return [{
      ...summary,
      characterIds: assignments.map((assignment) => assignment.celebId),
      assignments,
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
  return summaries.sort((a, b) => (
    b.recordCount - a.recordCount
    || a.title.localeCompare(b.title, 'ko')
  ))
}

export async function saveFictionSource(input: {
  contentId: string
  celebIds: string[]
}): Promise<void> {
  await requireAdmin()
  const contentId = input.contentId.trim()
  const celebIds = [...new Set(input.celebIds)]

  if (!contentId) throw new Error('대표 콘텐츠 ID가 필요합니다')
  if (celebIds.some((id) => !id)) throw new Error('비어 있는 인물 ID가 포함되어 있습니다')

  const admin = createAdminClient()
  const { data: previous, error: previousError } = await admin
    .from('fiction_source_characters')
    .select('celeb_id')
    .eq('content_id', contentId)
  if (previousError) throw new Error(`기존 대표 원전 인물 조회 실패: ${previousError.message}`)

  const { error } = await admin.rpc('set_fiction_source_characters', {
    p_content_id: contentId,
    p_celeb_ids: celebIds,
  })
  if (error) throw new Error(`대표 원전 저장 실패: ${error.message}`)

  const affectedCelebIds = [...new Set([...(previous ?? []).map((row) => row.celeb_id), ...celebIds])]
  const { data: celebs, error: celebsError } = affectedCelebIds.length > 0
    ? await admin.from('celebs').select('id, slug').in('id', affectedCelebIds)
    : { data: [], error: null }
  if (celebsError) throw new Error(`대표 원전 인물 slug 조회 실패: ${celebsError.message}`)

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
      .from('content_locales')
      .select('affiliate_url')
      .eq('content_id', contentId)
      .eq('locale', 'en')
      .maybeSingle()
    if (englishEditionError) {
      throw new Error(`영문판 구매 링크 조회 실패: ${englishEditionError.message}`)
    }
    const hasAmazon = Array.isArray(englishEdition?.affiliate_url)
      && englishEdition.affiliate_url.some((link) => (
        link
        && typeof link === 'object'
        && 'platform' in link
        && link.platform === 'amazon'
        && 'url' in link
        && typeof link.url === 'string'
        && link.url.trim()
      ))
    if (!hasAmazon) {
      throw new Error('영어 등장 설명은 실제 영문판의 Amazon 링크를 먼저 등록해야 저장할 수 있습니다')
    }
  }
  const [currentResult, celebResult] = await Promise.all([
    admin
      .from('fiction_source_characters')
      .select('description,description_en')
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
  if (!currentResult.data) throw new Error('저장할 원전 인물 연결을 찾을 수 없습니다')
  if (celebResult.error) {
    throw new Error(`대표 원전 인물 slug 조회 실패: ${celebResult.error.message}`)
  }

  const currentDescription = currentResult.data.description?.trim() || null
  const currentDescriptionEn = currentResult.data.description_en?.trim() || null
  if (currentDescription === description && currentDescriptionEn === descriptionEn) return

  const { data: updated, error: updateError } = await admin
    .from('fiction_source_characters')
    .update({ description, description_en: descriptionEn })
    .eq('content_id', contentId)
    .eq('celeb_id', celebId)
    .select('celeb_id')
    .maybeSingle()
  if (updateError) throw new Error(`등장 설명 저장 실패: ${updateError.message}`)
  if (!updated) throw new Error('저장할 원전 인물 연결을 찾을 수 없습니다')

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

export async function removeFictionSource(contentId: string): Promise<void> {
  await requireAdmin()
  const id = contentId.trim()
  if (!id) throw new Error('대표 콘텐츠 ID가 필요합니다')

  const admin = createAdminClient()
  const { data: previous, error: previousError } = await admin
    .from('fiction_source_characters')
    .select('celeb_id')
    .eq('content_id', id)
  if (previousError) throw new Error(`기존 대표 원전 인물 조회 실패: ${previousError.message}`)

  const { error } = await admin
    .from('fiction_source_contents')
    .delete()
    .eq('content_id', id)
  if (error) throw new Error(`대표 원전 지정 해제 실패: ${error.message}`)

  const affectedCelebIds = [...new Set((previous ?? []).map((row) => row.celeb_id))]
  const { data: celebs, error: celebsError } = affectedCelebIds.length > 0
    ? await admin.from('celebs').select('id, slug').in('id', affectedCelebIds)
    : { data: [], error: null }
  if (celebsError) throw new Error(`대표 원전 인물 slug 조회 실패: ${celebsError.message}`)

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
