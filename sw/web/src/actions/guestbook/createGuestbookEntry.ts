'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { type ActionResult, failure, success, handleSupabaseError } from '@/lib/errors'

interface CreateGuestbookEntryParams {
  profileId: string
  content: string
  isPrivate?: boolean
}

interface GuestbookEntryData {
  id: string
  profile_id: string
  author_id: string
  content: string
  is_private: boolean
  created_at: string
  author: {
    id: string
    nickname: string
    avatar_url: string | null
  }
}

export async function createGuestbookEntry(params: CreateGuestbookEntryParams): Promise<ActionResult<GuestbookEntryData>> {
  const { profileId, content, isPrivate = false } = params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return failure('UNAUTHORIZED')
  }

  // 글자수 제한 (500자)
  if (content.length > 500) {
    return failure('LIMIT_EXCEEDED', '방명록은 500자까지 작성할 수 있다.')
  }

  if (content.trim().length === 0) {
    return failure('VALIDATION_ERROR', '내용을 입력해달라.')
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
    return handleSupabaseError(error, { context: 'guestbook', logPrefix: '[방명록 작성]' })
  }

  revalidatePath('/profile/guestbook')

  return success(data as GuestbookEntryData)
}
