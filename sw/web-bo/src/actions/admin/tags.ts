'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// #region Types
export interface CelebTag {
  id: string
  name: string
  description: string | null
  color: string
  sort_order: number
  is_featured: boolean
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
  description?: string
  color?: string
  is_featured?: boolean
  start_date?: string | null
  end_date?: string | null
}

interface UpdateTagInput {
  id: string
  name?: string
  description?: string
  color?: string
  sort_order?: number
  is_featured?: boolean
  start_date?: string | null
  end_date?: string | null
}

export interface TagsResponse {
  tags: CelebTag[]
  total: number
}
// #endregion

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
    ...tag,
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

  return data
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
      description: input.description?.trim() || null,
      color: input.color || '#7c4dff',
      sort_order: nextSortOrder,
      is_featured: input.is_featured ?? false,
      start_date: input.start_date || null,
      end_date: input.end_date || null,
    })
    .select('id')
    .single()

  if (error) {
    if (error.code === '23505') {
      return { error: '이미 존재하는 태그 이름이다.' }
    }
    console.error('태그 생성 에러:', error)
    return { error: error.message }
  }

  revalidatePath('/members/tags')
  return { id: data.id }
}
// #endregion

// #region updateTag
export async function updateTag(input: UpdateTagInput): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString()
  }

  if (input.name !== undefined) updateData.name = input.name.trim()
  if (input.description !== undefined) updateData.description = input.description?.trim() || null
  if (input.color !== undefined) updateData.color = input.color
  if (input.sort_order !== undefined) updateData.sort_order = input.sort_order
  if (input.is_featured !== undefined) updateData.is_featured = input.is_featured
  if (input.start_date !== undefined) updateData.start_date = input.start_date || null
  if (input.end_date !== undefined) updateData.end_date = input.end_date || null

  const { error } = await supabase
    .from('celeb_tags')
    .update(updateData)
    .eq('id', input.id)

  if (error) {
    if (error.code === '23505') {
      return { success: false, error: '이미 존재하는 태그 이름이다.' }
    }
    console.error('태그 수정 에러:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/members/tags')
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

  revalidatePath('/members/tags')
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

  revalidatePath('/members/tags')
  return { success: true }
}
// #endregion

// #region getCelebTags - 특정 셀럽의 태그 목록 (설명 포함)
export interface CelebTagWithDesc extends CelebTag {
  short_desc: string | null
  long_desc: string | null
}

export async function getCelebTags(celebId: string): Promise<CelebTagWithDesc[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('celeb_tag_assignments')
    .select('short_desc, long_desc, tag:celeb_tags(*)')
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
    }))
    .filter(t => t.id)
}
// #endregion

// #region getTagCelebs - 특정 태그에 소속된 셀럽 목록 (설명 포함, 순서대로)
export async function getTagCelebs(tagId: string): Promise<CelebTagAssignment[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('celeb_tag_assignments')
    .select('celeb_id, tag_id, short_desc, long_desc, sort_order, celeb:profiles!celeb_tag_assignments_celeb_id_fkey(id, nickname, avatar_url, title)')
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

  revalidatePath(`/members/${celebId}`)
  revalidatePath('/members')
  revalidatePath('/members/tags')
  return { success: true }
}
// #endregion

// #region updateTagAssignmentDesc - 단일 태그 설명 수정
export async function updateTagAssignmentDesc(
  celebId: string,
  tagId: string,
  short_desc: string | null,
  long_desc: string | null
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  console.log('[updateTagAssignmentDesc] Input:', { celebId, tagId, short_desc, long_desc })

  const { data, error } = await supabase
    .from('celeb_tag_assignments')
    .update({ short_desc, long_desc })
    .eq('celeb_id', celebId)
    .eq('tag_id', tagId)
    .select()

  console.log('[updateTagAssignmentDesc] Result:', { data, error })

  if (error) {
    console.error('태그 설명 수정 에러:', error)
    return { success: false, error: error.message }
  }

  if (!data || data.length === 0) {
    console.error('태그 설명 수정 실패: 해당 레코드 없음')
    return { success: false, error: '해당 태그 할당을 찾을 수 없다.' }
  }

  revalidatePath(`/members/${celebId}`)
  revalidatePath('/members/tags')
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

  revalidatePath('/members/tags')
  revalidatePath(`/members/${celebId}`)
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

  revalidatePath('/members/tags')
  revalidatePath(`/members/${celebId}`)
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

  revalidatePath('/members/tags')
  return { success: true }
}
// #endregion
