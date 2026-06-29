'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function deleteGuestbookEntry(entryId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('로그인이 필요합니다')
  }

  // 작성자 또는 방명록 주인만 삭제 가능
  const { data: entry, error: fetchError } = await supabase
    .from('guestbook_entries')
    .select('author_id, profile_id')
    .eq('id', entryId)
    .single()

  if (fetchError || !entry) {
    throw new Error('방명록을 찾을 수 없습니다')
  }

  if (entry.author_id !== user.id && entry.profile_id !== user.id) {
    throw new Error('삭제 권한이 없습니다')
  }

  const { error } = await supabase
    .from('guestbook_entries')
    .delete()
    .eq('id', entryId)

  if (error) {
    console.error('Delete guestbook entry error:', error)
    throw new Error('방명록 삭제에 실패했습니다')
  }

  revalidatePath('/profile/guestbook')

  return { success: true }
}
