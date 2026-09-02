'use server'

import { createClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'

interface UpdateGuestbookEntryParams {
  entryId: string
  subjectKind: 'member' | 'celeb'
  content: string
  isPrivate?: boolean
}

export async function updateGuestbookEntry(params: UpdateGuestbookEntryParams) {
  const { entryId, subjectKind, content, isPrivate } = params
  const db = await createClient()

  const { data: { user } } = await db.auth.getUser()
  if (!user) throw new Error('로그인이 필요합니다')
  if (content.length > 500) throw new Error('방명록은 500자까지 작성할 수 있습니다')
  if (content.trim().length === 0) throw new Error('내용을 입력해주세요')

  const entryResult = subjectKind === 'member'
    ? await db
      .from('member_guestbook_entries')
      .select('id, owner_member_id')
      .eq('id', entryId)
      .eq('author_member_id', user.id)
      .maybeSingle()
    : await db
      .from('celeb_guestbook_entries')
      .select('id, celeb_id')
      .eq('id', entryId)
      .eq('author_member_id', user.id)
      .maybeSingle()

  if (!entryResult.data) {
    throw new Error('수정할 수 있는 방명록을 찾을 수 없습니다')
  }

  const baseUpdate = {
    content: content.trim(),
    updated_at: new Date().toISOString(),
  }

  const result = subjectKind === 'member'
    ? await db
        .from('member_guestbook_entries')
        .update(isPrivate === undefined ? baseUpdate : { ...baseUpdate, is_private: isPrivate })
        .eq('id', entryId)
        .eq('author_member_id', user.id)
        .select()
        .single()
    : await db
        .from('celeb_guestbook_entries')
        .update(baseUpdate)
        .eq('id', entryId)
        .eq('author_member_id', user.id)
        .select()
        .single()

  if (result.error) {
    console.error('Update guestbook entry error:', result.error)
    throw new Error('방명록 수정에 실패했습니다')
  }

  revalidatePath('/profile/guestbook')
  if (subjectKind === 'member' && 'owner_member_id' in entryResult.data) {
    revalidatePath(`/${entryResult.data.owner_member_id}`)
  } else if ('celeb_id' in entryResult.data) {
    const { data: celeb } = await db
      .from('celebs')
      .select('slug')
      .eq('id', entryResult.data.celeb_id)
      .maybeSingle()
    if (celeb?.slug) {
      revalidatePath(`/celeb/${celeb.slug}`)
      revalidatePath(`/en/celeb/${celeb.slug}`)
    }
  }
  return result.data
}
