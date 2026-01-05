'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

interface UpdateGuestbookEntryParams {
  entryId: string
  content: string
  isPrivate?: boolean
}

export async function updateGuestbookEntry(params: UpdateGuestbookEntryParams) {
  const { entryId, content, isPrivate } = params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('로그인이 필요합니다')
  }

  if (content.length > 500) {
    throw new Error('방명록은 500자까지 작성할 수 있습니다')
  }

  if (content.trim().length === 0) {
    throw new Error('내용을 입력해주세요')
  }

  const updateData: Record<string, unknown> = {
    content: content.trim(),
    updated_at: new Date().toISOString()
  }

  if (isPrivate !== undefined) {
    updateData.is_private = isPrivate
  }

  const { data, error } = await supabase
    .from('guestbook_entries')
    .update(updateData)
    .eq('id', entryId)
    .eq('author_id', user.id)
    .select()
    .single()

  if (error) {
    console.error('Update guestbook entry error:', error)
    throw new Error('방명록 수정에 실패했습니다')
  }

  revalidatePath('/profile/guestbook')

  return data
}
