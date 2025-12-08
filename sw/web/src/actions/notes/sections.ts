'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { NoteSection } from './types'

// Supabase 조인 결과 타입
interface SectionWithNote {
  id: string
  note: {
    id: string
    user_id: string
    content_id: string
  } | {
    id: string
    user_id: string
    content_id: string
  }[]
}

function getNoteFromSection(section: SectionWithNote) {
  const note = section.note
  return Array.isArray(note) ? note[0] : note
}

interface AddSectionParams {
  noteId: string
  title: string
  memo?: string
}

export async function addSection(params: AddSectionParams): Promise<NoteSection> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('로그인이 필요합니다')
  }

  // 노트 소유권 확인
  const { data: note } = await supabase
    .from('notes')
    .select('id, content_id')
    .eq('id', params.noteId)
    .eq('user_id', user.id)
    .single()

  if (!note) {
    throw new Error('노트를 찾을 수 없습니다')
  }

  // 현재 최대 sort_order 조회
  const { data: maxOrder } = await supabase
    .from('note_sections')
    .select('sort_order')
    .eq('note_id', params.noteId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .single()

  const newOrder = (maxOrder?.sort_order ?? -1) + 1

  const { data, error } = await supabase
    .from('note_sections')
    .insert({
      note_id: params.noteId,
      title: params.title,
      memo: params.memo ?? null,
      sort_order: newOrder,
    })
    .select()
    .single()

  if (error) {
    console.error('Add section error:', error)
    throw new Error('구획 추가에 실패했습니다')
  }

  // 노트 updated_at 갱신
  await supabase
    .from('notes')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', params.noteId)

  revalidatePath(`/archive/${note.content_id}`)

  return data as NoteSection
}

interface UpdateSectionParams {
  sectionId: string
  title?: string
  memo?: string
  isCompleted?: boolean
}

export async function updateSection(params: UpdateSectionParams): Promise<void> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('로그인이 필요합니다')
  }

  // 섹션 및 노트 소유권 확인
  const { data: section } = await supabase
    .from('note_sections')
    .select(`
      id,
      note:notes!inner(id, user_id, content_id)
    `)
    .eq('id', params.sectionId)
    .single()

  if (!section) {
    throw new Error('구획을 찾을 수 없습니다')
  }

  const note = getNoteFromSection(section as SectionWithNote)
  if (!note || note.user_id !== user.id) {
    throw new Error('구획을 찾을 수 없습니다')
  }

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }

  if (params.title !== undefined) updateData.title = params.title
  if (params.memo !== undefined) updateData.memo = params.memo
  if (params.isCompleted !== undefined) updateData.is_completed = params.isCompleted

  const { error } = await supabase
    .from('note_sections')
    .update(updateData)
    .eq('id', params.sectionId)

  if (error) {
    console.error('Update section error:', error)
    throw new Error('구획 수정에 실패했습니다')
  }

  // 노트 updated_at 갱신
  await supabase
    .from('notes')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', note.id)

  revalidatePath(`/archive/${note.content_id}`)
}

export async function deleteSection(sectionId: string): Promise<void> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('로그인이 필요합니다')
  }

  // 섹션 및 노트 소유권 확인
  const { data: section } = await supabase
    .from('note_sections')
    .select(`
      id,
      note:notes!inner(id, user_id, content_id)
    `)
    .eq('id', sectionId)
    .single()

  if (!section) {
    throw new Error('구획을 찾을 수 없습니다')
  }

  const note = getNoteFromSection(section as SectionWithNote)
  if (!note || note.user_id !== user.id) {
    throw new Error('구획을 찾을 수 없습니다')
  }

  const { error } = await supabase
    .from('note_sections')
    .delete()
    .eq('id', sectionId)

  if (error) {
    console.error('Delete section error:', error)
    throw new Error('구획 삭제에 실패했습니다')
  }

  // 노트 updated_at 갱신
  await supabase
    .from('notes')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', note.id)

  revalidatePath(`/archive/${note.content_id}`)
}

interface ReorderSectionsParams {
  noteId: string
  sectionIds: string[]
}

export async function reorderSections(params: ReorderSectionsParams): Promise<void> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('로그인이 필요합니다')
  }

  // 노트 소유권 확인
  const { data: note } = await supabase
    .from('notes')
    .select('id, content_id')
    .eq('id', params.noteId)
    .eq('user_id', user.id)
    .single()

  if (!note) {
    throw new Error('노트를 찾을 수 없습니다')
  }

  // 각 섹션의 sort_order 업데이트
  const updates = params.sectionIds.map((id, index) =>
    supabase
      .from('note_sections')
      .update({ sort_order: index })
      .eq('id', id)
      .eq('note_id', params.noteId)
  )

  await Promise.all(updates)

  // 노트 updated_at 갱신
  await supabase
    .from('notes')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', params.noteId)

  revalidatePath(`/archive/${note.content_id}`)
}
