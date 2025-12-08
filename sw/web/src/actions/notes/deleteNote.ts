'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function deleteNote(noteId: string): Promise<void> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('로그인이 필요합니다')
  }

  // 노트 정보 가져오기 (revalidatePath용)
  const { data: note } = await supabase
    .from('notes')
    .select('content_id')
    .eq('id', noteId)
    .eq('user_id', user.id)
    .single()

  if (!note) {
    throw new Error('노트를 찾을 수 없습니다')
  }

  // 삭제 (note_sections는 CASCADE로 자동 삭제)
  const { error } = await supabase
    .from('notes')
    .delete()
    .eq('id', noteId)
    .eq('user_id', user.id)

  if (error) {
    console.error('Delete note error:', error)
    throw new Error('노트 삭제에 실패했습니다')
  }

  revalidatePath(`/archive/${note.content_id}`)
}
