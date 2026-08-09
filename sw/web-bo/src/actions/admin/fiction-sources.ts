'use server'

import { revalidatePath } from 'next/cache'
import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { requireAdmin } from '@/lib/admin-auth'
import { revalidateWebCache } from '@/lib/revalidate-web'
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
}

export interface FictionSourceAdminItem extends FictionSourceContentSummary {
  characterIds: string[]
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
}

interface SourceRow {
  content_id: string
  updated_at: string
}

interface AssignmentRow {
  content_id: string
  celeb_id: string
  sort_order: number
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
      .select('content_id,celeb_id,sort_order')
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
        .select('content_id,locale,title,creator,thumbnail_url,isbn')
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
  const characterIdsByContent = new Map<string, string[]>()

  for (const assignment of assignmentRows) {
    const contentId = assignment.content_id
    const ids = characterIdsByContent.get(contentId) ?? []
    ids.push(assignment.celeb_id)
    characterIdsByContent.set(contentId, ids)
  }

  const sources = sourceRows.flatMap((row): FictionSourceAdminItem[] => {
    const summary = summaryById.get(row.content_id)
    if (!summary) return []
    return [{
      ...summary,
      characterIds: characterIdsByContent.get(summary.id) ?? [],
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
  const { error } = await admin.rpc('set_fiction_source_characters', {
    p_content_id: contentId,
    p_celeb_ids: celebIds,
  })
  if (error) throw new Error(`대표 원전 저장 실패: ${error.message}`)

  revalidatePath('/fiction-sources')
  revalidatePath(`/contents/${contentId}`)
  await revalidateWebCache([
    CACHE_TAGS.FICTION_SOURCES,
    CACHE_TAGS.CELEBS,
    CACHE_TAGS.CONTENTS,
  ])
}

export async function removeFictionSource(contentId: string): Promise<void> {
  await requireAdmin()
  const id = contentId.trim()
  if (!id) throw new Error('대표 콘텐츠 ID가 필요합니다')

  const admin = createAdminClient()
  const { error } = await admin
    .from('fiction_source_contents')
    .delete()
    .eq('content_id', id)
  if (error) throw new Error(`대표 원전 지정 해제 실패: ${error.message}`)

  revalidatePath('/fiction-sources')
  revalidatePath(`/contents/${id}`)
  await revalidateWebCache([
    CACHE_TAGS.FICTION_SOURCES,
    CACHE_TAGS.CELEBS,
    CACHE_TAGS.CONTENTS,
  ])
}
