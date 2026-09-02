'use server'

import { createClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'

export async function deleteGuestbookEntry(entryId: string, subjectKind: 'member' | 'celeb') {
  const db = await createClient()

  const { data: { user } } = await db.auth.getUser()
  if (!user) throw new Error('로그인이 필요합니다')

  const entryResult = subjectKind === 'member'
    ? await db
      .from('member_guestbook_entries')
      .select('author_member_id, owner_member_id')
      .eq('id', entryId)
      .maybeSingle()
    : await db
      .from('celeb_guestbook_entries')
      .select('author_member_id, celeb_id')
      .eq('id', entryId)
      .maybeSingle()

  if (!entryResult.data) {
    throw new Error('방명록을 찾을 수 없습니다')
  }

  if (subjectKind === 'member' && 'owner_member_id' in entryResult.data) {
    const entry = entryResult.data
    if (entry.author_member_id !== user.id && entry.owner_member_id !== user.id) {
      throw new Error('삭제 권한이 없습니다')
    }

    const { error } = await db
      .from('member_guestbook_entries')
      .delete()
      .eq('id', entryId)
    if (error) throw error
    revalidatePath(`/${entry.owner_member_id}`)
  } else if ('celeb_id' in entryResult.data) {
    if (entryResult.data.author_member_id !== user.id) {
      throw new Error('삭제 권한이 없습니다')
    }

    const { error } = await db
      .from('celeb_guestbook_entries')
      .delete()
      .eq('id', entryId)
    if (error) throw error

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

  revalidatePath('/profile/guestbook')
  return { success: true }
}
