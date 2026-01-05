'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

interface CreateGuestbookEntryParams {
  profileId: string
  content: string
  isPrivate?: boolean
}

export async function createGuestbookEntry(params: CreateGuestbookEntryParams) {
  const { profileId, content, isPrivate = false } = params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('로그인이 필요합니다')
  }

  // 글자수 제한 (500자)
  if (content.length > 500) {
    throw new Error('방명록은 500자까지 작성할 수 있습니다')
  }

  if (content.trim().length === 0) {
    throw new Error('내용을 입력해주세요')
  }

  const { data, error } = await supabase
    .from('guestbook_entries')
    .insert({
      profile_id: profileId,
      author_id: user.id,
      content: content.trim(),
      is_private: isPrivate
    })
    .select(`
      *,
      author:profiles!author_id(id, nickname, avatar_url)
    `)
    .single()

  if (error) {
    console.error('Create guestbook entry error:', error)
    if (error.code === '42501') {
      throw new Error('방명록을 작성할 수 없습니다')
    }
    throw new Error('방명록 작성에 실패했습니다')
  }

  revalidatePath('/profile/guestbook')

  return data
}
