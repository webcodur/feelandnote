'use server'

import { createClient } from '@/lib/supabase/server'
import type { Note, NoteWithContent } from './types'

export async function getNote(noteId: string): Promise<Note | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('notes')
    .select(`
      *,
      sections:note_sections(*)
    `)
    .eq('id', noteId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw new Error('노트 조회에 실패했습니다')
  }

  return data as Note
}

export async function getNoteByContentId(contentId: string): Promise<Note | null> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('로그인이 필요합니다')
  }

  const { data, error } = await supabase
    .from('notes')
    .select(`
      *,
      sections:note_sections(
        id,
        note_id,
        title,
        memo,
        is_completed,
        sort_order,
        created_at,
        updated_at
      )
    `)
    .eq('user_id', user.id)
    .eq('content_id', contentId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    console.error('Get note error:', error)
    throw new Error('노트 조회에 실패했습니다')
  }

  // sections 정렬
  if (data.sections) {
    data.sections.sort((a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order)
  }

  return data as Note
}

export async function getMyNotes(): Promise<NoteWithContent[]> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('로그인이 필요합니다')
  }

  const { data, error } = await supabase
    .from('notes')
    .select(`
      *,
      content:contents(id, title, type, thumbnail_url, creator),
      sections:note_sections(count)
    `)
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })

  if (error) {
    console.error('Get my notes error:', error)
    throw new Error('노트 목록 조회에 실패했습니다')
  }

  return data as unknown as NoteWithContent[]
}
