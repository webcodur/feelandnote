'use server'

/**
 * 세력도감 테마 CRUD와 웹 전용 편성 액션.
 * `celeb_tags`·`celeb_tag_assignments`는 호환을 위해 유지하는 DB 이름이며,
 * 별도 셀럽 태그 관리 화면이나 셀럽 편집 폼에서는 이 액션을 사용하지 않는다.
 */

import { createClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import { revalidateWebCeleb, revalidateWebItems, revalidateWebLists } from '@/lib/revalidate-web'
import { CACHE_TAGS, type CacheItemTarget } from '@feelandnote/shared/constants/cache-tags'
import {
  toTeamImages, serializeTeamImages, type FactionTeamImage,
} from '@feelandnote/shared/lib/faction-team-image'

// #region Types
export interface CelebTag {
  id: string
  name: string
  name_en: string | null
  description: string | null
  description_en: string | null
  color: string
  slug: string | null
  /** 단체 사진 — 주소마다 「어느 묶음을 찍었고 누가 나오는지」를 함께 쥔다 */
  team_images: FactionTeamImage[]
  sort_order: number
  is_featured: boolean
  /** 신화 아틀라스에서 이 전승을 공개하는가. 세력도감 노출(is_featured)과 다른 축이다 */
  atlas_published: boolean
  /** 신화·전승 갈래인가. 참인 테마만 신화 공개 축을 다룬다 */
  is_fiction: boolean
  /** 상위 그룹 테마의 id. null 이면 무소속(최상위). 자식을 가진 테마가 곧 그룹이다 */
  parent_id: string | null
  start_date: string | null
  end_date: string | null
  created_at: string
  updated_at: string
  celeb_count?: number
}

export interface CelebTagAssignment {
  celeb_id: string
  tag_id: string
  short_desc: string | null
  long_desc: string | null
  short_desc_en: string | null
  long_desc_en: string | null
  faction_image_url: string | null
  sort_order: number
  /** 도감에서 이 테마의 이 인물을 감출지. 셀럽 전역 상태와 무관한 웹 전용 스위치다 */
  hidden: boolean
  /** 배정 행(celeb_tag_assignments)의 id */
  assignment_id: string | null
  /** 웹 그룹(celeb_tag_groups) id */
  group_id?: string | null
  /** 도감에 보이는 그룹 이름(뷰의 group_label) */
  group_label?: string | null
  celeb?: {
    id: string
    nickname: string
    avatar_url: string | null
    title: string | null
  }
}

/**
 * DB 뷰 `faction_atlas_members` 한 행 — 세력도감 인물의 단일 읽기 창구(웹 배정 + 그룹 이름).
 * 뷰는 자동생성 타입에 없어 로컬로 정의한다(sw/web getFeaturedTags 의 AtlasMemberRow 와 같은 패턴).
 */
interface AtlasMemberRow {
  tag_id: string
  celeb_id: string
  short_desc: string | null
  short_desc_en: string | null
  long_desc: string | null
  long_desc_en: string | null
  faction_image_url: string | null
  sort_order: number | null
  hidden: boolean | null
  assignment_id: string | null
  group_label?: string | null
}

interface CreateTagInput {
  name: string
  name_en?: string | null
  description?: string
  description_en?: string | null
  color?: string
  slug?: string | null
  is_featured?: boolean
  start_date?: string | null
  end_date?: string | null
}

interface UpdateTagInput {
  id: string
  name?: string
  name_en?: string | null
  description?: string
  description_en?: string | null
  color?: string
  slug?: string | null
  sort_order?: number
  is_featured?: boolean
  atlas_published?: boolean
  /** 상위 그룹 지정. null 이면 무소속으로 되돌린다 */
  parent_id?: string | null
  start_date?: string | null
  end_date?: string | null
}

// DB 행 → CelebTag 정규화 (team_images Json → 사진 목록. 옛 문자열 배열도 읽힌다)
function normalizeTag(row: Record<string, unknown>): CelebTag {
  return {
    ...(row as unknown as CelebTag),
    slug: (row.slug as string | null) ?? null,
    parent_id: (row.parent_id as string | null) ?? null,
    team_images: toTeamImages(row.team_images),
  }
}

export interface TagsResponse {
  tags: CelebTag[]
  total: number
}
// #endregion

/** 세력도감 통합 목록과 편·테마 편집 화면을 함께 갱신한다. */
function revalidateThemeScreens() {
  revalidatePath('/factions')
  revalidatePath('/factions/[theme]', 'page')
  revalidatePath('/myths')
}

// #region getTags
export async function getTags(): Promise<TagsResponse> {
  const db = await createClient()

  const { data, error } = await db
    .from('celeb_tags')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })

  if (error) {
    console.error('태그 목록 조회 에러:', error)
    return { tags: [], total: 0 }
  }

  const tags: CelebTag[] = (data ?? []).map(normalizeTag)

  return { tags, total: tags.length }
}
// #endregion

// #region getTag
export async function getTag(tagId: string): Promise<CelebTag | null> {
  const db = await createClient()

  const { data, error } = await db
    .from('celeb_tags')
    .select('*')
    .eq('id', tagId)
    .maybeSingle()

  if (error) throw new Error(`Failed to load celeb tag: ${error.message}`)
  if (!data) return null

  return normalizeTag(data)
}
// #endregion

// #region createTag
export async function createTag(input: CreateTagInput): Promise<{ id: string } | { error: string }> {
  const db = await createClient()

  // 최대 sort_order 조회
  const { data: maxData } = await db
    .from('celeb_tags')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1)
    .single()

  const nextSortOrder = (maxData?.sort_order ?? -1) + 1

  const { data, error } = await db
    .from('celeb_tags')
    .insert({
      name: input.name.trim(),
      name_en: input.name_en?.trim() || null,
      description: input.description?.trim() || null,
      description_en: input.description_en?.trim() || null,
      color: input.color || '#7c4dff',
      slug: input.slug?.trim() || null,
      sort_order: nextSortOrder,
      is_featured: input.is_featured ?? false,
      start_date: input.start_date || null,
      end_date: input.end_date || null,
    })
    .select('id')
    .single()

  if (error) {
    if (error.code === '23505') {
      return { error: error.message.includes('slug') ? '이미 사용 중인 주소(slug)다.' : '이미 존재하는 태그 이름이다.' }
    }
    console.error('태그 생성 에러:', error)
    return { error: error.message }
  }

  revalidateThemeScreens()
  // celeb_tags 신규 — 태그 편성과 태그명을 품은 셀럽 목록 캐시 모두 갱신
  await revalidateWebLists([CACHE_TAGS.TAGS, CACHE_TAGS.CELEBS])
  return { id: data.id }
}
// #endregion

// #region 상위 그룹 검증
/**
 * 상위 그룹 지정이 성립하는지 본다. 어긋나면 사람이 읽을 이유를 돌려준다.
 *
 * 위계는 두 단계까지만 둔다. 세력도감 화면이 그룹 머리 하나 밑에 테마를 늘어놓는 구조라
 * 손자 단계가 생기면 그릴 자리가 없다.
 */
async function checkParentAssignment(
  db: Awaited<ReturnType<typeof createClient>>,
  tagId: string,
  parentId: string | null,
): Promise<string | null> {
  if (!parentId) return null
  if (parentId === tagId) return '테마를 자기 자신의 상위 그룹으로 지정할 수 없습니다.'

  const { data, error } = await db.from('celeb_tags').select('id, parent_id, name')
  if (error) return `상위 그룹 확인 실패: ${error.message}`

  const rows = (data ?? []) as { id: string; parent_id: string | null; name: string }[]
  const byId = new Map(rows.map(r => [r.id, r]))

  const parent = byId.get(parentId)
  if (!parent) return '상위 그룹으로 지정한 테마를 찾을 수 없습니다.'
  if (parent.parent_id) return `${parent.name}은(는) 이미 다른 그룹에 속해 있어 상위 그룹이 될 수 없습니다.`
  if (rows.some(r => r.parent_id === tagId)) return '아래에 테마를 거느린 그룹은 다른 그룹 밑으로 넣을 수 없습니다.'

  // 위 두 검사로 이미 막히지만, 데이터가 어긋나 있을 때 무한 순환을 도는 것만은 막는다
  const seen = new Set<string>([tagId])
  let cursor: string | null = parentId
  while (cursor) {
    if (seen.has(cursor)) return '상위 그룹이 서로를 가리키게 됩니다.'
    seen.add(cursor)
    cursor = byId.get(cursor)?.parent_id ?? null
  }
  return null
}
// #endregion

async function getAtlasTagCelebTargets(
  db: Awaited<ReturnType<typeof createClient>>,
  tagId: string,
): Promise<CacheItemTarget[]> {
  const { data: assignments, error: assignmentsError } = await db
    .from('faction_atlas_members')
    .select('celeb_id')
    .eq('tag_id', tagId)
  if (assignmentsError) throw new Error(`도감 태그 인물 조회 실패: ${assignmentsError.message}`)

  const celebIds = [...new Set((assignments ?? []).map((row) => row.celeb_id))]
  if (celebIds.length === 0) return []

  const { data: celebs, error: celebsError } = await db
    .from('celebs')
    .select('id, slug')
    .in('id', celebIds)
  if (celebsError) throw new Error(`도감 태그 인물 slug 조회 실패: ${celebsError.message}`)

  const targets: CacheItemTarget[] = []
  for (const celeb of celebs ?? []) {
    targets.push({ domain: CACHE_TAGS.CELEBS, id: celeb.id })
    if (celeb.slug) targets.push({ domain: CACHE_TAGS.CELEBS, id: celeb.slug })
  }
  return targets
}

async function revalidateAtlasTagCelebs(
  targets: readonly CacheItemTarget[],
): Promise<void> {
  const listDomains = [CACHE_TAGS.TAGS, CACHE_TAGS.CELEBS]
  if (targets.length === 0) {
    await revalidateWebLists(listDomains)
    return
  }
  await revalidateWebItems(targets, listDomains)
}

// #region updateTag
export async function updateTag(input: UpdateTagInput): Promise<{ success: boolean; error?: string }> {
  const db = await createClient()

  if (input.parent_id !== undefined) {
    const reason = await checkParentAssignment(db, input.id, input.parent_id)
    if (reason) return { success: false, error: reason }
  }

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString()
  }

  if (input.name !== undefined) updateData.name = input.name.trim()
  if (input.name_en !== undefined) updateData.name_en = input.name_en?.trim() || null
  if (input.description !== undefined) updateData.description = input.description?.trim() || null
  if (input.description_en !== undefined) updateData.description_en = input.description_en?.trim() || null
  if (input.color !== undefined) updateData.color = input.color
  if (input.slug !== undefined) updateData.slug = input.slug?.trim() || null
  if (input.sort_order !== undefined) updateData.sort_order = input.sort_order
  if (input.is_featured !== undefined) updateData.is_featured = input.is_featured
  if (input.atlas_published !== undefined) updateData.atlas_published = input.atlas_published
  if (input.parent_id !== undefined) updateData.parent_id = input.parent_id || null
  if (input.start_date !== undefined) updateData.start_date = input.start_date || null
  if (input.end_date !== undefined) updateData.end_date = input.end_date || null

  const { error } = await db
    .from('celeb_tags')
    .update(updateData)
    .eq('id', input.id)

  if (error) {
    if (error.code === '23505') {
      return { success: false, error: error.message.includes('slug') ? '이미 사용 중인 주소(slug)다.' : '이미 존재하는 태그 이름이다.' }
    }
    console.error('태그 수정 에러:', error)
    return { success: false, error: error.message }
  }

  revalidateThemeScreens()
  // celeb_tags 수정(이름·색·slug) — 태그명이 셀럽 목록 캐시에 박혀 있어 함께 갱신
  await revalidateAtlasTagCelebs(await getAtlasTagCelebTargets(db, input.id))
  return { success: true }
}
// #endregion

// #region deleteTag
export async function deleteTag(tagId: string): Promise<{ success: boolean; error?: string }> {
  const db = await createClient()
  const cacheTargets = await getAtlasTagCelebTargets(db, tagId)

  const { error } = await db
    .from('celeb_tags')
    .delete()
    .eq('id', tagId)

  if (error) {
    console.error('태그 삭제 에러:', error)
    return { success: false, error: error.message }
  }

  revalidateThemeScreens()
  // celeb_tags 삭제 — 배정(celeb_tag_assignments)까지 연쇄 제거되므로 셀럽 캐시도 갱신
  await revalidateAtlasTagCelebs(cacheTargets)
  return { success: true }
}
// #endregion

// #region updateTagOrder
export async function updateTagOrder(tagIds: string[]): Promise<{ success: boolean; error?: string }> {
  const db = await createClient()

  // 순서대로 sort_order 업데이트
  const updates = tagIds.map((id, index) =>
    db
      .from('celeb_tags')
      .update({ sort_order: index, updated_at: new Date().toISOString() })
      .eq('id', id)
  )

  const results = await Promise.all(updates)
  const hasError = results.some(r => r.error)

  if (hasError) {
    console.error('태그 순서 변경 에러:', results.find(r => r.error)?.error)
    return { success: false, error: '태그 순서 변경에 실패했다.' }
  }

  revalidateThemeScreens()
  // celeb_tags.sort_order — 노출 순서만 바뀌므로 태그 편성 캐시만
  await revalidateWebLists(CACHE_TAGS.TAGS)
  return { success: true }
}
// #endregion

// #region 뷰 행 찾기 - 쓰기 액션이 고칠 배정 행
/** (태그, 셀럽) 한 짝의 뷰 행을 찾는다. 쓰기 액션이 배정 행 id 를 얻는 데 쓴다. */
async function findAtlasRow(
  db: Awaited<ReturnType<typeof createClient>>,
  tagId: string,
  celebId: string,
): Promise<{ row: AtlasMemberRow | null; error: string | null }> {
  const { data, error } = await db
    .from('faction_atlas_members')
    .select('tag_id, celeb_id, short_desc, short_desc_en, long_desc, long_desc_en, faction_image_url, sort_order, hidden, assignment_id')
    .eq('tag_id', tagId)
    .eq('celeb_id', celebId)
    .maybeSingle()
    .overrideTypes<AtlasMemberRow, { merge: false }>()

  if (error) {
    console.error('도감 인물 행 조회 에러:', error)
    return { row: null, error: error.message }
  }
  return { row: data ?? null, error: null }
}

/** 한 명의 도감 배정만 바뀐 뒤 그 인물 상세과 도감·인물 목록만 갱신한다. */
async function revalidateAtlasCeleb(
  db: Awaited<ReturnType<typeof createClient>>,
  celebId: string,
): Promise<void> {
  const { data, error } = await db
    .from('celebs')
    .select('slug')
    .eq('id', celebId)
    .single()
  if (error) throw new Error(`도감 인물 slug 조회 실패: ${error.message}`)
  await revalidateWebCeleb(celebId, data.slug, [CACHE_TAGS.TAGS, CACHE_TAGS.CELEBS])
}
// #endregion

// #region getTagCelebs - 특정 태그에 소속된 셀럽 목록 (설명 포함, 순서대로)
/**
 * 단일 원천 뷰(faction_atlas_members)에서 읽는다.
 * 뷰에는 celebs 조인이 없으므로 셀럽 정보는 celeb_id 로 2단계 조회한다.
 */
export async function getTagCelebs(tagId: string): Promise<CelebTagAssignment[]> {
  const db = await createClient()

  const { data, error } = await db
    .from('faction_atlas_members')
    .select('tag_id, celeb_id, short_desc, short_desc_en, long_desc, long_desc_en, faction_image_url, sort_order, hidden, assignment_id, group_label')
    .eq('tag_id', tagId)
    .order('sort_order', { ascending: true })
    .overrideTypes<AtlasMemberRow[], { merge: false }>()

  if (error) {
    console.error('태그 셀럽 조회 에러:', error)
    return []
  }

  const rows = data ?? []
  const celebIds = [...new Set(rows.map(r => r.celeb_id))]
  const profileMap = new Map<string, NonNullable<CelebTagAssignment['celeb']>>()

  // 웹 그룹 id는 뷰에 없다 — 배정 행에서 읽어 명단 행에 붙인다
  const { data: groupRows, error: groupError } = await db
    .from('celeb_tag_assignments')
    .select('id, group_id')
    .eq('tag_id', tagId)
  if (groupError) console.error('태그 그룹 배정 조회 에러:', groupError)
  const groupByAssignment = new Map(
    (groupRows ?? []).map(r => [r.id as string, (r.group_id as string | null) ?? null]),
  )

  if (celebIds.length > 0) {
    const { data: celebs, error: celebsError } = await db
      .from('celebs')
      .select('id, nickname, avatar_url, title')
      .in('id', celebIds)

    if (celebsError) {
      console.error('태그 셀럽 조회 에러:', celebsError)
    }
    for (const p of celebs ?? []) {
      profileMap.set(p.id, {
        id: p.id,
        nickname: p.nickname ?? '',
        avatar_url: p.avatar_url ?? null,
        title: p.title ?? null,
      })
    }
  }

  return rows.map(item => ({
    celeb_id: item.celeb_id,
    tag_id: item.tag_id,
    short_desc: item.short_desc,
    long_desc: item.long_desc,
    short_desc_en: item.short_desc_en ?? null,
    long_desc_en: item.long_desc_en ?? null,
    faction_image_url: item.faction_image_url ?? null,
    hidden: item.hidden === true,
    sort_order: item.sort_order ?? 0,
    assignment_id: item.assignment_id ?? null,
    group_id: item.assignment_id ? groupByAssignment.get(item.assignment_id) ?? null : null,
    group_label: item.group_label ?? null,
    celeb: profileMap.get(item.celeb_id),
  }))
}
// #endregion

// #region updateTagAssignmentDesc - 단일 태그 설명 수정
export async function updateTagAssignmentDesc(
  celebId: string,
  tagId: string,
  short_desc: string | null,
  long_desc: string | null,
  short_desc_en?: string | null,
  long_desc_en?: string | null
): Promise<{ success: boolean; error?: string }> {
  const db = await createClient()

  const { row, error: findError } = await findAtlasRow(db, tagId, celebId)
  if (findError) return { success: false, error: findError }
  if (!row) {
    console.error('태그 설명 수정 실패: 해당 레코드 없음')
    return { success: false, error: '해당 태그 할당을 찾을 수 없다.' }
  }

  const updatePayload: Record<string, string | null> = { short_desc, long_desc }
  if (short_desc_en !== undefined) updatePayload.short_desc_en = short_desc_en
  if (long_desc_en !== undefined) updatePayload.long_desc_en = long_desc_en

  const { error } = await db
    .from('celeb_tag_assignments')
    .update(updatePayload)
    .eq('id', row.assignment_id)

  if (error) {
    console.error('태그 설명 수정 에러:', error)
    return { success: false, error: error.message }
  }

  revalidateThemeScreens()
  // 소개문 — 세력도감 소개글이 셀럽 캐시에도 실린다
  await revalidateAtlasCeleb(db, celebId)
  return { success: true }
}
// #endregion

// #region searchCelebsForTag - 태그에 추가할 셀럽 검색
export interface CelebForTag {
  id: string
  nickname: string
  avatar_url: string | null
  title: string | null
  profession: string | null
}

export async function searchCelebsForTag(
  search: string,
  excludeTagId?: string
): Promise<CelebForTag[]> {
  const db = await createClient()

  let query = db
    .from('celebs')
    .select('id, nickname, avatar_url, title, profession')
    .eq('publication_status', 'active')
    .order('nickname', { ascending: true })
    .limit(20)

  if (search.trim()) {
    query = query.ilike('nickname', `%${search.trim()}%`)
  }

  const { data, error } = await query

  if (error) {
    console.error('셀럽 검색 에러:', error)
    return []
  }

  // 이미 해당 태그에 속한 셀럽 제외
  if (excludeTagId && data && data.length > 0) {
    const { data: assigned } = await db
      .from('celeb_tag_assignments')
      .select('celeb_id')
      .eq('tag_id', excludeTagId)

    const assignedIds = new Set(assigned?.map(a => a.celeb_id) ?? [])
    return (data ?? [])
      .filter(c => !assignedIds.has(c.id))
      .map(c => ({
        id: c.id,
        nickname: c.nickname ?? '',
        avatar_url: c.avatar_url,
        title: c.title,
        profession: c.profession,
      }))
  }

  return (data ?? []).map(c => ({
    id: c.id,
    nickname: c.nickname ?? '',
    avatar_url: c.avatar_url,
    title: c.title,
    profession: c.profession,
  }))
}
// #endregion

// #region addCelebToTag - 태그에 셀럽 추가 (가장 뒤 순서로)
export async function addCelebToTag(
  celebId: string,
  tagId: string,
  short_desc?: string | null,
  long_desc?: string | null
): Promise<{ success: boolean; error?: string; sort_order?: number }> {
  const db = await createClient()

  // 현재 태그의 최대 sort_order 조회
  const { data: maxData } = await db
    .from('celeb_tag_assignments')
    .select('sort_order')
    .eq('tag_id', tagId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .single()

  const nextSortOrder = (maxData?.sort_order ?? -1) + 1

  const { error } = await db
    .from('celeb_tag_assignments')
    .insert({
      celeb_id: celebId,
      tag_id: tagId,
      short_desc: short_desc || null,
      long_desc: long_desc || null,
      sort_order: nextSortOrder,
    })

  if (error) {
    if (error.code === '23505') {
      return { success: false, error: '이미 해당 태그에 등록된 셀럽이다.' }
    }
    console.error('태그에 셀럽 추가 에러:', error)
    return { success: false, error: error.message }
  }

  revalidateThemeScreens()
  // celeb_tag_assignments 신규 — 셀럽 목록 카드에도 배정 태그가 실린다
  await revalidateAtlasCeleb(db, celebId)
  return { success: true, sort_order: nextSortOrder }
}
// #endregion

// #region removeCelebFromTag - 태그에서 셀럽 제거
export async function removeCelebFromTag(
  celebId: string,
  tagId: string
): Promise<{ success: boolean; error?: string }> {
  const db = await createClient()

  const { row, error: findError } = await findAtlasRow(db, tagId, celebId)
  if (findError) return { success: false, error: findError }
  if (!row) return { success: false, error: '해당 태그 할당을 찾을 수 없다.' }

  const { error } = await db
    .from('celeb_tag_assignments')
    .delete()
    .eq('id', row.assignment_id)

  if (error) {
    console.error('태그에서 셀럽 제거 에러:', error)
    return { success: false, error: error.message }
  }

  revalidateThemeScreens()
  // celeb_tag_assignments 삭제 — 셀럽 목록 카드에서도 배정 태그가 빠져야 한다
  await revalidateAtlasCeleb(db, celebId)
  return { success: true }
}
// #endregion

// #region updateTagCelebOrder - 태그 내 셀럽 순서 업데이트
export async function updateTagCelebOrder(
  tagId: string,
  celebIds: string[]
): Promise<{ success: boolean; error?: string }> {
  const db = await createClient()

  const results = await Promise.all(celebIds.map((celebId, index) =>
    db
      .from('celeb_tag_assignments')
      .update({ sort_order: index })
      .eq('tag_id', tagId)
      .eq('celeb_id', celebId)
  ))
  const failed = results.find(r => r.error)
  if (failed) {
    console.error('태그 셀럽 순서 변경 에러:', failed.error)
    return { success: false, error: '셀럽 순서 변경에 실패했다.' }
  }

  revalidateThemeScreens()
  // celeb_tag_assignments.sort_order — 셀럽 목록 카드 노출 순서에도 반영된다
  await revalidateWebLists([CACHE_TAGS.TAGS, CACHE_TAGS.CELEBS])
  return { success: true }
}
// #endregion

// #region setTagTeamImages - 단체 이미지 저장 (업로드/삭제/재정렬/설명 편집 결과)
export async function setTagTeamImages(
  tagId: string,
  images: FactionTeamImage[]
): Promise<{ success: boolean; error?: string }> {
  const db = await createClient()

  const { error } = await db
    .from('celeb_tags')
    .update({ team_images: serializeTeamImages(images), updated_at: new Date().toISOString() })
    .eq('id', tagId)

  if (error) {
    console.error('단체 이미지 저장 에러:', error)
    return { success: false, error: error.message }
  }

  revalidateThemeScreens()
  // celeb_tags.team_images — 태그 편성 화면 전용
  await revalidateWebLists(CACHE_TAGS.TAGS)
  return { success: true }
}
// #endregion

// #region setTagCelebHidden - 도감에서 이 테마의 이 인물을 감출지
/**
 * 도감 노출 스위치 — 테마마다 따로 잡는다.
 *
 * 셀럽 전역 상태(`celebs.publication_status`)와 무관하다. 도감이 보는 것은 이 스위치 하나다.
 */
export async function setTagCelebHidden(
  tagId: string,
  celebId: string,
  hidden: boolean
): Promise<{ success: boolean; error?: string }> {
  const db = await createClient()

  const { row, error: findError } = await findAtlasRow(db, tagId, celebId)
  if (findError) return { success: false, error: findError }
  if (!row) return { success: false, error: '해당 태그 할당을 찾을 수 없다.' }

  const { error } = await db
    .from('celeb_tag_assignments')
    .update({ hidden })
    .eq('id', row.assignment_id)

  if (error) {
    console.error('도감 노출 전환 에러:', error)
    return { success: false, error: error.message }
  }

  revalidateThemeScreens()
  await revalidateAtlasCeleb(db, celebId)
  return { success: true }
}
// #endregion

// #region setTagCelebImage - 인물 전용 화보 URL 저장 (null이면 해제)
export async function setTagCelebImage(
  tagId: string,
  celebId: string,
  url: string | null
): Promise<{ success: boolean; error?: string }> {
  const db = await createClient()

  const { row, error: findError } = await findAtlasRow(db, tagId, celebId)
  if (findError) return { success: false, error: findError }
  if (!row) return { success: false, error: '해당 태그 할당을 찾을 수 없다.' }

  const { error } = await db
    .from('celeb_tag_assignments')
    .update({ faction_image_url: url })
    .eq('id', row.assignment_id)

  if (error) {
    console.error('전용 화보 저장 에러:', error)
    return { success: false, error: error.message }
  }

  revalidateThemeScreens()
  // faction_image_url — 셀럽 카드 이미지에도 반영된다
  await revalidateAtlasCeleb(db, celebId)
  return { success: true }
}
// #endregion

// #region 웹 그룹 — 테마 안 인물 묶음(celeb_tag_groups)
export interface TagGroup {
  id: string
  name: string
  name_en: string | null
  sort_order: number
  /** 신화 탐색 그룹 개요의 본문 — 이 무리가 누구이고 작품에서 어떤 구실을 하는지 */
  description: string | null
  description_en: string | null
}

export async function getTagGroups(tagId: string): Promise<TagGroup[]> {
  const db = await createClient()
  const { data, error } = await db
    .from('celeb_tag_groups')
    .select('id, name, name_en, sort_order, description, description_en')
    .eq('tag_id', tagId)
    .order('sort_order', { ascending: true })
  if (error) {
    console.error('테마 그룹 조회 에러:', error)
    return []
  }
  return (data ?? []) as TagGroup[]
}

/** 그룹을 맨 뒤 순서로 하나 더한다 */
export async function createTagGroup(
  tagId: string,
  name: string,
  nameEn: string | null,
): Promise<{ group?: TagGroup; error?: string }> {
  const trimmed = name.trim()
  if (!trimmed) return { error: '그룹 이름이 비었다.' }
  const db = await createClient()
  const { data: last } = await db
    .from('celeb_tag_groups')
    .select('sort_order')
    .eq('tag_id', tagId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()
  const { data, error } = await db
    .from('celeb_tag_groups')
    .insert({ tag_id: tagId, name: trimmed, name_en: nameEn?.trim() || null, sort_order: ((last?.sort_order as number | undefined) ?? 0) + 1 })
    .select('id, name, name_en, sort_order, description, description_en')
    .single()
  if (error) {
    console.error('테마 그룹 추가 에러:', error)
    return { error: error.code === '23505' ? '같은 이름의 그룹이 이미 있다.' : error.message }
  }
  revalidateThemeScreens()
  return { group: data as TagGroup }
}

/** 그룹 이름·설명(ko·en)을 고친다 — 설명은 신화 탐색 그룹 개요의 본문이 된다 */
export async function updateTagGroup(
  groupId: string,
  patch: Partial<Pick<TagGroup, 'name' | 'name_en' | 'description' | 'description_en'>>,
): Promise<{ success: boolean; error?: string }> {
  const name = patch.name?.trim()
  if (patch.name !== undefined && !name) return { success: false, error: '그룹 이름이 비었다.' }
  const db = await createClient()
  const { error } = await db
    .from('celeb_tag_groups')
    .update({ ...patch, ...(name ? { name } : {}), updated_at: new Date().toISOString() })
    .eq('id', groupId)
  if (error) {
    console.error('테마 그룹 수정 에러:', error)
    return { success: false, error: error.code === '23505' ? '같은 이름의 그룹이 이미 있다.' : error.message }
  }
  revalidateThemeScreens()
  return { success: true }
}

/** 그룹 차례를 통째로 다시 적는다 — 신화 화면의 그룹 탭 순서가 된다 */
export async function reorderTagGroups(
  tagId: string,
  groupIds: string[],
): Promise<{ success: boolean; error?: string }> {
  const db = await createClient()
  const now = new Date().toISOString()
  const results = await Promise.all(groupIds.map((id, index) => db
    .from('celeb_tag_groups')
    .update({ sort_order: index + 1, updated_at: now })
    .eq('id', id)
    .eq('tag_id', tagId)))
  const failed = results.find(r => r.error)?.error
  if (failed) {
    console.error('테마 그룹 순서 변경 에러:', failed)
    return { success: false, error: failed.message }
  }
  revalidateThemeScreens()
  return { success: true }
}

/** 그룹을 지운다. 구성원은 그룹이 풀려 맨 끝 「그 외」로 간다(배정의 group_id를 DB가 비운다) */
export async function deleteTagGroup(groupId: string): Promise<{ success: boolean; error?: string }> {
  const db = await createClient()
  const { error } = await db.from('celeb_tag_groups').delete().eq('id', groupId)
  if (error) {
    console.error('테마 그룹 삭제 에러:', error)
    return { success: false, error: error.message }
  }
  revalidateThemeScreens()
  return { success: true }
}

/** 인물의 그룹을 바꾼다. null이면 그룹을 빼고 맨 끝 「그 외」로 보낸다. */
export async function setTagCelebGroup(
  tagId: string,
  celebId: string,
  groupId: string | null,
): Promise<{ success: boolean; error?: string }> {
  const db = await createClient()

  const { row, error: findError } = await findAtlasRow(db, tagId, celebId)
  if (findError) return { success: false, error: findError }
  if (!row) return { success: false, error: '해당 태그 할당을 찾을 수 없다.' }

  const { error } = await db
    .from('celeb_tag_assignments')
    .update({ group_id: groupId })
    .eq('id', row.assignment_id)

  if (error) {
    console.error('그룹 지정 에러:', error)
    return { success: false, error: error.message }
  }

  revalidateThemeScreens()
  await revalidateAtlasCeleb(db, celebId)
  return { success: true }
}
// #endregion
