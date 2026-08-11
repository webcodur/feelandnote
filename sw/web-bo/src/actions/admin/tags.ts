'use server'

/**
 * 세력도감 테마 CRUD와 웹 전용 편성 액션.
 * `celeb_tags`·`celeb_tag_assignments`는 호환을 위해 유지하는 DB 이름이며,
 * 별도 셀럽 태그 관리 화면이나 셀럽 편집 폼에서는 이 액션을 사용하지 않는다.
 */

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { revalidateWebCache } from '@/lib/revalidate-web'
import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { factionAdminClient, requireFactionAdmin } from '@/lib/faction-db'
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
  /**
   * 이 행의 유래 — 'production'은 영상 제작 인물(faction_people)에서 온 행이라
   * 편집이 그 테이블의 web_* 칸에 쓰이고 삭제 대신 숨김만 된다.
   * 'manual'은 웹 전용 배정(celeb_tag_assignments)이라 기존처럼 다룬다.
   */
  source: 'production' | 'manual'
  /** source='production'일 때 제작 행(faction_people)의 id */
  person_id: string | null
  /** source='manual'일 때 배정 행(celeb_tag_assignments)의 id */
  assignment_id: string | null
  celeb?: {
    id: string
    nickname: string
    avatar_url: string | null
    title: string | null
  }
}

/**
 * DB 뷰 `faction_atlas_members` 한 행 — 세력도감 인물의 단일 읽기 창구.
 * 제작 유래(faction_people, web_* 손질 우선) ∪ 웹 전용 배정을 합쳐 준다.
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
  source: 'production' | 'manual'
  person_id: string | null
  assignment_id: string | null
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
  revalidatePath('/factions/[episode]', 'page')
}

// #region getTags
export async function getTags(): Promise<TagsResponse> {
  const supabase = await createClient()

  const { data, error } = await supabase
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
  const supabase = await createClient()

  const { data, error } = await supabase
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
  const supabase = await createClient()

  // 최대 sort_order 조회
  const { data: maxData } = await supabase
    .from('celeb_tags')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1)
    .single()

  const nextSortOrder = (maxData?.sort_order ?? -1) + 1

  const { data, error } = await supabase
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
  await revalidateWebCache([CACHE_TAGS.TAGS, CACHE_TAGS.CELEBS])
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
  supabase: Awaited<ReturnType<typeof createClient>>,
  tagId: string,
  parentId: string | null,
): Promise<string | null> {
  if (!parentId) return null
  if (parentId === tagId) return '테마를 자기 자신의 상위 그룹으로 지정할 수 없습니다.'

  const { data, error } = await supabase.from('celeb_tags').select('id, parent_id, name')
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

// #region updateTag
export async function updateTag(input: UpdateTagInput): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  if (input.parent_id !== undefined) {
    const reason = await checkParentAssignment(supabase, input.id, input.parent_id)
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
  if (input.parent_id !== undefined) updateData.parent_id = input.parent_id || null
  if (input.start_date !== undefined) updateData.start_date = input.start_date || null
  if (input.end_date !== undefined) updateData.end_date = input.end_date || null

  const { error } = await supabase
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
  await revalidateWebCache([CACHE_TAGS.TAGS, CACHE_TAGS.CELEBS])
  return { success: true }
}
// #endregion

// #region deleteTag
export async function deleteTag(tagId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('celeb_tags')
    .delete()
    .eq('id', tagId)

  if (error) {
    console.error('태그 삭제 에러:', error)
    return { success: false, error: error.message }
  }

  revalidateThemeScreens()
  // celeb_tags 삭제 — 배정(celeb_tag_assignments)까지 연쇄 제거되므로 셀럽 캐시도 갱신
  await revalidateWebCache([CACHE_TAGS.TAGS, CACHE_TAGS.CELEBS])
  return { success: true }
}
// #endregion

// #region updateTagOrder
export async function updateTagOrder(tagIds: string[]): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  // 순서대로 sort_order 업데이트
  const updates = tagIds.map((id, index) =>
    supabase
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
  await revalidateWebCache(CACHE_TAGS.TAGS)
  return { success: true }
}
// #endregion

// #region 뷰 행 판별 - 편집 대상이 제작 유래인지 웹 전용 배정인지
/**
 * (태그, 셀럽) 한 짝의 뷰 행을 찾는다. 뷰가 같은 짝을 두 번 싣지 않으므로(제작 유래가 있으면
 * 웹 전용 배정은 뷰에서 빠진다) 단건 조회로 충분하다. 쓰기 액션들이 분기 근거로 쓴다.
 */
async function findAtlasRow(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tagId: string,
  celebId: string,
): Promise<{ row: AtlasMemberRow | null; error: string | null }> {
  const { data, error } = await supabase
    .from('faction_atlas_members')
    .select('tag_id, celeb_id, short_desc, short_desc_en, long_desc, long_desc_en, faction_image_url, sort_order, hidden, source, person_id, assignment_id')
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
// #endregion

// #region getTagCelebs - 특정 태그에 소속된 셀럽 목록 (설명 포함, 순서대로)
/**
 * 단일 원천 뷰(faction_atlas_members)에서 읽는다 — 제작 유래(web_* 손질 반영) ∪ 웹 전용 배정.
 * 뷰에는 celebs 조인이 없으므로 셀럽 정보는 celeb_id 로 2단계 조회한다.
 */
export async function getTagCelebs(tagId: string): Promise<CelebTagAssignment[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('faction_atlas_members')
    .select('tag_id, celeb_id, short_desc, short_desc_en, long_desc, long_desc_en, faction_image_url, sort_order, hidden, source, person_id, assignment_id')
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

  if (celebIds.length > 0) {
    const { data: celebs, error: celebsError } = await supabase
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
    source: item.source,
    person_id: item.person_id ?? null,
    assignment_id: item.assignment_id ?? null,
    celeb: profileMap.get(item.celeb_id),
  }))
}
// #endregion

// #region updateTagAssignmentDesc - 단일 태그 설명 수정
/**
 * 소개문 저장 — 유래에 따라 쓰는 곳이 갈린다.
 * - production: 한줄 직함은 faction_people.lines[0] 고정이다. 이 액션은
 *   web_long_desc(±en) 상세 손질만 저장하며 short_desc 인자는 무시한다.
 * - manual: 영상 원문이 없으므로 기존처럼 celeb_tag_assignments 의 한줄·상세를 모두 저장한다.
 */
export async function updateTagAssignmentDesc(
  celebId: string,
  tagId: string,
  short_desc: string | null,
  long_desc: string | null,
  short_desc_en?: string | null,
  long_desc_en?: string | null
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const { row, error: findError } = await findAtlasRow(supabase, tagId, celebId)
  if (findError) return { success: false, error: findError }
  if (!row) {
    console.error('태그 설명 수정 실패: 해당 레코드 없음')
    return { success: false, error: '해당 태그 할당을 찾을 수 없다.' }
  }

  if (row.source === 'production') {
    // 값이 그대로인 저장(포커스만 스친 blur)은 건너뛴다 — 안 그러면 제작 원문이
    // web_* 사본으로 얼어붙어 이후 제작 쪽 수정이 도감에 반영되지 않는다
    const unchanged =
      long_desc === row.long_desc &&
      (long_desc_en === undefined || long_desc_en === row.long_desc_en)
    if (unchanged) return { success: true }

    await requireFactionAdmin()
    const updatePayload: Record<string, string | null> = {
      web_long_desc: long_desc,
    }
    if (long_desc_en !== undefined) updatePayload.web_long_desc_en = long_desc_en

    const { error } = await factionAdminClient()
      .from('faction_people')
      .update(updatePayload)
      .eq('id', row.person_id)

    if (error) {
      console.error('제작 인물 소개 손질 저장 에러:', error)
      return { success: false, error: error.message }
    }
  } else {
    const updatePayload: Record<string, string | null> = { short_desc, long_desc }
    if (short_desc_en !== undefined) updatePayload.short_desc_en = short_desc_en
    if (long_desc_en !== undefined) updatePayload.long_desc_en = long_desc_en

    const { error } = await supabase
      .from('celeb_tag_assignments')
      .update(updatePayload)
      .eq('id', row.assignment_id)

    if (error) {
      console.error('태그 설명 수정 에러:', error)
      return { success: false, error: error.message }
    }
  }

  revalidateThemeScreens()
  // 소개문 — 세력도감 소개글이 셀럽 캐시에도 실린다
  await revalidateWebCache([CACHE_TAGS.TAGS, CACHE_TAGS.CELEBS])
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
  const supabase = await createClient()

  let query = supabase
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
  // [단일화 전환 주의] 배정 테이블 기준이라 제작 유래 사본이 삭제되면(P4) 제작 유래 인물이
  // 검색에 다시 뜬다 — 그 경우 addCelebToTag 가 insert 대신 숨김 해제로 받아낸다.
  if (excludeTagId && data && data.length > 0) {
    const { data: assigned } = await supabase
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
/**
 * 웹 전용 배정 추가. 단, 그 (태그, 셀럽) 짝이 이미 제작 유래로 존재하면 새 배정을 만들지 않고
 * 숨김(web_hidden)을 풀어 되살린다 — 같은 인물이 두 갈래로 실리는 것을 막는다.
 */
export async function addCelebToTag(
  celebId: string,
  tagId: string,
  short_desc?: string | null,
  long_desc?: string | null
): Promise<{ success: boolean; error?: string; sort_order?: number; revived?: boolean }> {
  const supabase = await createClient()

  const { row: existing, error: findError } = await findAtlasRow(supabase, tagId, celebId)
  if (findError) return { success: false, error: findError }

  if (existing?.source === 'production') {
    if (existing.hidden !== true) {
      return { success: false, error: '이미 해당 태그에 등록된 셀럽이다. (제작 유래)' }
    }
    await requireFactionAdmin()
    const { error } = await factionAdminClient()
      .from('faction_people')
      .update({ web_hidden: false })
      .eq('id', existing.person_id)

    if (error) {
      console.error('제작 유래 인물 숨김 해제 에러:', error)
      return { success: false, error: error.message }
    }

    revalidateThemeScreens()
    await revalidateWebCache([CACHE_TAGS.TAGS, CACHE_TAGS.CELEBS])
    return { success: true, revived: true }
  }

  // 현재 태그의 최대 sort_order 조회
  const { data: maxData } = await supabase
    .from('celeb_tag_assignments')
    .select('sort_order')
    .eq('tag_id', tagId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .single()

  const nextSortOrder = (maxData?.sort_order ?? -1) + 1

  const { error } = await supabase
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
  await revalidateWebCache([CACHE_TAGS.TAGS, CACHE_TAGS.CELEBS])
  return { success: true, sort_order: nextSortOrder }
}
// #endregion

// #region removeCelebFromTag - 태그에서 셀럽 제거
/**
 * 제거 — 유래에 따라 실체가 다르다.
 * - manual: 배정 행을 지운다(기존 동작).
 * - production: 지울 실체가 배정이 아니라 제작 인물이라 삭제할 수 없다.
 *   대신 web_hidden=true 로 숨기고 `hiddenInstead` 로 알린다.
 */
export async function removeCelebFromTag(
  celebId: string,
  tagId: string
): Promise<{ success: boolean; error?: string; hiddenInstead?: boolean }> {
  const supabase = await createClient()

  const { row, error: findError } = await findAtlasRow(supabase, tagId, celebId)
  if (findError) return { success: false, error: findError }
  if (!row) return { success: false, error: '해당 태그 할당을 찾을 수 없다.' }

  if (row.source === 'production') {
    await requireFactionAdmin()
    const { error } = await factionAdminClient()
      .from('faction_people')
      .update({ web_hidden: true })
      .eq('id', row.person_id)

    if (error) {
      console.error('제작 유래 인물 숨김 처리 에러:', error)
      return { success: false, error: error.message }
    }

    revalidateThemeScreens()
    await revalidateWebCache([CACHE_TAGS.TAGS, CACHE_TAGS.CELEBS])
    return { success: true, hiddenInstead: true }
  }

  const { error } = await supabase
    .from('celeb_tag_assignments')
    .delete()
    .eq('id', row.assignment_id)

  if (error) {
    console.error('태그에서 셀럽 제거 에러:', error)
    return { success: false, error: error.message }
  }

  revalidateThemeScreens()
  // celeb_tag_assignments 삭제 — 셀럽 목록 카드에서도 배정 태그가 빠져야 한다
  await revalidateWebCache([CACHE_TAGS.TAGS, CACHE_TAGS.CELEBS])
  return { success: true }
}
// #endregion

// #region updateTagCelebOrder - 태그 내 셀럽 순서 업데이트
/**
 * 순서 저장 — **웹 전용 배정에만** 먹는다. 제작 유래 행의 순서는 제작 편집기 소관이라
 * 건너뛰고, 건너뛴 수를 `skippedProduction` 으로 알린다. 뷰가 제작 순번을 앞에,
 * 웹 전용을 뒤에 두므로 여기서는 웹 전용끼리의 상대 순서만 기록한다.
 */
export async function updateTagCelebOrder(
  tagId: string,
  celebIds: string[]
): Promise<{ success: boolean; error?: string; skippedProduction?: number }> {
  const supabase = await createClient()

  const { data: viewRows, error: viewError } = await supabase
    .from('faction_atlas_members')
    .select('celeb_id, source')
    .eq('tag_id', tagId)
    .overrideTypes<Pick<AtlasMemberRow, 'celeb_id' | 'source'>[], { merge: false }>()

  if (viewError) {
    console.error('태그 셀럽 순서 변경 에러(뷰 조회):', viewError)
    return { success: false, error: '셀럽 순서 변경에 실패했다.' }
  }

  const manualIds = new Set((viewRows ?? []).filter(r => r.source === 'manual').map(r => r.celeb_id))
  const manualOrder = celebIds.filter(id => manualIds.has(id))
  const skippedProduction = celebIds.length - manualOrder.length

  if (manualOrder.length > 0) {
    // 웹 전용끼리의 상대 순서대로 sort_order 업데이트
    const updates = manualOrder.map((celebId, index) =>
      supabase
        .from('celeb_tag_assignments')
        .update({ sort_order: index })
        .eq('tag_id', tagId)
        .eq('celeb_id', celebId)
    )

    const results = await Promise.all(updates)
    const hasError = results.some(r => r.error)

    if (hasError) {
      console.error('태그 셀럽 순서 변경 에러:', results.find(r => r.error)?.error)
      return { success: false, error: '셀럽 순서 변경에 실패했다.' }
    }
  }

  revalidateThemeScreens()
  // celeb_tag_assignments.sort_order — 셀럽 목록 카드 노출 순서에도 반영된다
  await revalidateWebCache([CACHE_TAGS.TAGS, CACHE_TAGS.CELEBS])
  return { success: true, skippedProduction }
}
// #endregion

// #region setTagTeamImages - 단체 이미지 저장 (업로드/삭제/재정렬/설명 편집 결과)
export async function setTagTeamImages(
  tagId: string,
  images: FactionTeamImage[]
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('celeb_tags')
    .update({ team_images: serializeTeamImages(images), updated_at: new Date().toISOString() })
    .eq('id', tagId)

  if (error) {
    console.error('단체 이미지 저장 에러:', error)
    return { success: false, error: error.message }
  }

  revalidateThemeScreens()
  // celeb_tags.team_images — 태그 편성 화면 전용
  await revalidateWebCache(CACHE_TAGS.TAGS)
  return { success: true }
}
// #endregion

// #region setTagCelebHidden - 도감에서 이 테마의 이 인물을 감출지
/**
 * 도감 노출 스위치 — 테마마다 따로 잡는다.
 *
 * 예전에는 셀럽 전역 상태(`celebs.publication_status`)가 도감 노출까지 좌우했는데, 그 값은 영상 제작
 * 쪽 사정으로 정해지는 것이라 진열 판단과 맞지 않았다(팩션에서 등록한 42명이 13개 테마에서
 * 통째로 사라져 있었다). 이제 도감이 보는 것은 이 스위치 하나다.
 */
export async function setTagCelebHidden(
  tagId: string,
  celebId: string,
  hidden: boolean
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const { row, error: findError } = await findAtlasRow(supabase, tagId, celebId)
  if (findError) return { success: false, error: findError }
  if (!row) return { success: false, error: '해당 태그 할당을 찾을 수 없다.' }

  if (row.source === 'production') {
    await requireFactionAdmin()
    const { error } = await factionAdminClient()
      .from('faction_people')
      .update({ web_hidden: hidden })
      .eq('id', row.person_id)

    if (error) {
      console.error('도감 노출 전환 에러(제작 유래):', error)
      return { success: false, error: error.message }
    }
  } else {
    const { error } = await supabase
      .from('celeb_tag_assignments')
      .update({ hidden })
      .eq('id', row.assignment_id)

    if (error) {
      console.error('도감 노출 전환 에러:', error)
      return { success: false, error: error.message }
    }
  }

  revalidateThemeScreens()
  await revalidateWebCache(CACHE_TAGS.TAGS)
  return { success: true }
}
// #endregion

// #region setTagCelebImage - 인물 전용 화보 URL 저장 (null이면 해제)
export async function setTagCelebImage(
  tagId: string,
  celebId: string,
  url: string | null
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const { row, error: findError } = await findAtlasRow(supabase, tagId, celebId)
  if (findError) return { success: false, error: findError }
  if (!row) return { success: false, error: '해당 태그 할당을 찾을 수 없다.' }

  if (row.source === 'production') {
    await requireFactionAdmin()
    const { error } = await factionAdminClient()
      .from('faction_people')
      .update({ web_image_url: url })
      .eq('id', row.person_id)

    if (error) {
      console.error('전용 화보 저장 에러(제작 유래):', error)
      return { success: false, error: error.message }
    }
  } else {
    const { error } = await supabase
      .from('celeb_tag_assignments')
      .update({ faction_image_url: url })
      .eq('id', row.assignment_id)

    if (error) {
      console.error('전용 화보 저장 에러:', error)
      return { success: false, error: error.message }
    }
  }

  revalidateThemeScreens()
  // faction_image_url — 셀럽 카드 이미지에도 반영된다
  await revalidateWebCache([CACHE_TAGS.TAGS, CACHE_TAGS.CELEBS])
  return { success: true }
}
// #endregion
