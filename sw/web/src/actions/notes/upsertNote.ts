'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Snapshot, Note } from './types'

interface UpsertNoteParams {
  contentId: string
  snapshot?: Snapshot
}

export async function upsertNote(params: UpsertNoteParams): Promise<Note> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('로그인이 필요합니다')
  }

  // 콘텐츠가 기록관에 있는지 확인
  const { data: userContent } = await supabase
    .from('user_contents')
    .select('id')
    .eq('user_id', user.id)
    .eq('content_id', params.contentId)
    .single()

  if (!userContent) {
    throw new Error('기록관에 추가된 콘텐츠만 노트를 작성할 수 있습니다')
  }

  // upsert: 있으면 업데이트, 없으면 생성
  const { data, error } = await supabase
    .from('notes')
    .upsert(
      {
        user_id: user.id,
        content_id: params.contentId,
        memo: '', // 초기화 시 빈 값
        snapshot: params.snapshot ?? {},
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'user_id,content_id',
      }
    )
    .select(`
      *,
      sections:note_sections(*)
    `)
    .single()

  if (error) {
    console.error('Upsert note error:', error)
    throw new Error('노트 저장에 실패했습니다')
  }

  revalidatePath(`/${user.id}/records/${params.contentId}`)

  return data as Note
}

export async function updateNoteMemo(
  noteId: string,
  memo: string
): Promise<void> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('로그인이 필요합니다')
  }

  const { error } = await supabase
    .from('notes')
    .update({ memo, updated_at: new Date().toISOString() })
    .eq('id', noteId)
    .eq('user_id', user.id)

  if (error) {
    console.error('Update memo error:', error)
    throw new Error('메모 저장에 실패했습니다')
  }
}

export async function updateNoteSnapshot(
  noteId: string,
  snapshot: Snapshot
): Promise<void> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('로그인이 필요합니다')
  }

  const { error } = await supabase
    .from('notes')
    .update({ snapshot, updated_at: new Date().toISOString() })
    .eq('id', noteId)
    .eq('user_id', user.id)

  if (error) {
    console.error('Update snapshot error:', error)
    throw new Error('스냅샷 저장에 실패했습니다')
  }
}


