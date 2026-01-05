'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function deleteGuestbookEntry(entryId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('로그인이 필요합니다')
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
