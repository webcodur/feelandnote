'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { revalidateWebCache } from '@/lib/revalidate-web'
import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'

// #region Types
export interface CelebTag {
  id: string
  name: string
  name_en: string | null
  description: string | null
  description_en: string | null
  color: string
  slug: string | null
  team_images: string[]
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
  spotlight_image_url: string | null
  sort_order: number
  celeb?: {
    id: string
    nickname: string
    avatar_url: string | null
    title: string | null
  }
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

// DB 행 → CelebTag 정규화 (team_images Json → string[])
function normalizeTag(row: Record<string, unknown>): CelebTag {
  const images = Array.isArray(row.team_images) ? (row.team_images as string[]) : []
  return {
    ...(row as unknown as CelebTag),
    slug: (row.slug as string | null) ?? null,
    parent_id: (row.parent_id as string | null) ?? null,
    team_images: images,
  }
}

export interface TagsResponse {
  tags: CelebTag[]
  total: number
}
// #endregion

/**
 * 도감 테마 화면 갱신 — 목록(세력도)과 테마 편집 화면 두 곳.
 * 옛 태그 관리 주소(`/celebs/tags`)는 26.07.25 에 세력도로 흡수됐다.
 */
function revalidateThemeScreens() {
  revalidatePath('/factions')
  revalidatePath('/factions/themes/[tagId]', 'page')
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

  // 태그별 셀럽 카운트 조회
  const { data: counts } = await supabase
    .rpc('get_tag_celeb_counts')

  const countMap = new Map<string, number>()
  counts?.forEach((row: { tag_id: string; celeb_count: number }) => {
    countMap.set(row.tag_id, row.celeb_count)
  })

  const tags: CelebTag[] = (data ?? []).map(tag => ({
    ...normalizeTag(tag),
    celeb_count: countMap.get(tag.id) ?? 0,
  }))

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
    .single()

  if (error) {
    console.error('태그 조회 에러:', error)
    return null
  }

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

// #region getCelebTags - 특정 셀럽의 태그 목록 (설명 포함)
export interface CelebTagWithDesc extends CelebTag {
  short_desc: string | null
  long_desc: string | null
  short_desc_en: string | null
  long_desc_en: string | null
}

export async function getCelebTags(celebId: string): Promise<CelebTagWithDesc[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('celeb_tag_assignments')
    .select('short_desc, long_desc, short_desc_en, long_desc_en, tag:celeb_tags(*)')
    .eq('celeb_id', celebId)

  if (error) {
    console.error('셀럽 태그 조회 에러:', error)
    return []
  }

  return (data ?? [])
    .map(item => ({
      ...(item.tag as unknown as CelebTag),
      short_desc: item.short_desc as string | null,
      long_desc: item.long_desc as string | null,
      short_desc_en: item.short_desc_en as string | null,
      long_desc_en: item.long_desc_en as string | null,
    }))
    .filter(t => t.id)
}
// #endregion

// #region getTagCelebs - 특정 태그에 소속된 셀럽 목록 (설명 포함, 순서대로)
export async function getTagCelebs(tagId: string): Promise<CelebTagAssignment[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('celeb_tag_assignments')
    .select('celeb_id, tag_id, short_desc, long_desc, short_desc_en, long_desc_en, spotlight_image_url, sort_order, celeb:profiles!celeb_tag_assignments_celeb_id_fkey(id, nickname, avatar_url, title)')
    .eq('tag_id', tagId)
    .order('sort_order', { ascending: true })

  if (error) {
    console.error('태그 셀럽 조회 에러:', error)
    return []
  }

  return (data ?? []).map(item => ({
    celeb_id: item.celeb_id,
    tag_id: item.tag_id,
    short_desc: item.short_desc,
    long_desc: item.long_desc,
    short_desc_en: item.short_desc_en ?? null,
    long_desc_en: item.long_desc_en ?? null,
    spotlight_image_url: item.spotlight_image_url ?? null,
    sort_order: item.sort_order ?? 0,
    celeb: (Array.isArray(item.celeb) ? item.celeb[0] : item.celeb) as CelebTagAssignment['celeb'],
  }))
}
// #endregion

// #region updateCelebTags - 셀럽의 태그 일괄 업데이트 (설명 포함)
export interface CelebTagInput {
  tagId: string
  short_desc?: string | null
  long_desc?: string | null
}

export async function updateCelebTags(
  celebId: string,
  tags: CelebTagInput[]
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  // 기존 태그 모두 삭제
  const { error: deleteError } = await supabase
    .from('celeb_tag_assignments')
    .delete()
    .eq('celeb_id', celebId)

  if (deleteError) {
    console.error('셀럽 태그 삭제 에러:', deleteError)
    return { success: false, error: deleteError.message }
  }

  // 새 태그 일괄 추가 (설명 포함)
  if (tags.length > 0) {
    const { error: insertError } = await supabase
      .from('celeb_tag_assignments')
      .insert(tags.map(t => ({
        celeb_id: celebId,
        tag_id: t.tagId,
        short_desc: t.short_desc || null,
        long_desc: t.long_desc || null,
      })))

    if (insertError) {
      console.error('셀럽 태그 추가 에러:', insertError)
      return { success: false, error: insertError.message }
    }
  }

  revalidatePath('/celebs/[slug]', 'page')
  revalidateThemeScreens()
  // celeb_tag_assignments 전면 교체 — 셀럽 목록·모달이 배정 태그를 함께 담는다
  await revalidateWebCache([CACHE_TAGS.TAGS, CACHE_TAGS.CELEBS])
  return { success: true }
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
  const supabase = await createClient()

  const updatePayload: Record<string, string | null> = { short_desc, long_desc }
  if (short_desc_en !== undefined) updatePayload.short_desc_en = short_desc_en
  if (long_desc_en !== undefined) updatePayload.long_desc_en = long_desc_en

  const { data, error } = await supabase
    .from('celeb_tag_assignments')
    .update(updatePayload)
    .eq('celeb_id', celebId)
    .eq('tag_id', tagId)
    .select()

  if (error) {
    console.error('태그 설명 수정 에러:', error)
    return { success: false, error: error.message }
  }

  if (!data || data.length === 0) {
    console.error('태그 설명 수정 실패: 해당 레코드 없음')
    return { success: false, error: '해당 태그 할당을 찾을 수 없다.' }
  }

  revalidatePath('/celebs/[slug]', 'page')
  revalidateThemeScreens()
  // celeb_tag_assignments 설명문 — 세력도감 소개글이 셀럽 캐시에도 실린다
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
    .from('profiles')
    .select('id, nickname, avatar_url, title, profession')
    .eq('profile_type', 'CELEB')
    .eq('status', 'active')
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
export async function addCelebToTag(
  celebId: string,
  tagId: string,
  short_desc?: string | null,
  long_desc?: string | null
): Promise<{ success: boolean; error?: string; sort_order?: number }> {
  const supabase = await createClient()

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
  revalidatePath('/celebs/[slug]', 'page')
  // celeb_tag_assignments 신규 — 셀럽 목록 카드에도 배정 태그가 실린다
  await revalidateWebCache([CACHE_TAGS.TAGS, CACHE_TAGS.CELEBS])
  return { success: true, sort_order: nextSortOrder }
}
// #endregion

// #region removeCelebFromTag - 태그에서 셀럽 제거
export async function removeCelebFromTag(
  celebId: string,
  tagId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('celeb_tag_assignments')
    .delete()
    .eq('celeb_id', celebId)
    .eq('tag_id', tagId)

  if (error) {
    console.error('태그에서 셀럽 제거 에러:', error)
    return { success: false, error: error.message }
  }

  revalidateThemeScreens()
  revalidatePath('/celebs/[slug]', 'page')
  // celeb_tag_assignments 삭제 — 셀럽 목록 카드에서도 배정 태그가 빠져야 한다
  await revalidateWebCache([CACHE_TAGS.TAGS, CACHE_TAGS.CELEBS])
  return { success: true }
}
// #endregion

// #region updateTagCelebOrder - 태그 내 셀럽 순서 업데이트
export async function updateTagCelebOrder(
  tagId: string,
  celebIds: string[]
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  // 순서대로 sort_order 업데이트
  const updates = celebIds.map((celebId, index) =>
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

  revalidateThemeScreens()
  // celeb_tag_assignments.sort_order — 셀럽 목록 카드 노출 순서에도 반영된다
  await revalidateWebCache([CACHE_TAGS.TAGS, CACHE_TAGS.CELEBS])
  return { success: true }
}
// #endregion

// #region setTagTeamImages - 단체 이미지 배열 저장 (업로드/삭제/재정렬 결과)
export async function setTagTeamImages(
  tagId: string,
  urls: string[]
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('celeb_tags')
    .update({ team_images: urls, updated_at: new Date().toISOString() })
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

// #region setTagCelebImage - 인물 전용 화보 URL 저장 (null이면 해제)
export async function setTagCelebImage(
  tagId: string,
  celebId: string,
  url: string | null
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('celeb_tag_assignments')
    .update({ spotlight_image_url: url })
    .eq('tag_id', tagId)
    .eq('celeb_id', celebId)

  if (error) {
    console.error('전용 화보 저장 에러:', error)
    return { success: false, error: error.message }
  }

  revalidateThemeScreens()
  // celeb_tag_assignments.spotlight_image_url — 셀럽 카드 이미지에도 반영된다
  await revalidateWebCache([CACHE_TAGS.TAGS, CACHE_TAGS.CELEBS])
  return { success: true }
}
// #endregion
