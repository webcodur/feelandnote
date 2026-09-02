'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/db/admin'

export type GuestbookSubjectKind = 'member' | 'celeb'

function guestbookTable(subjectKind: GuestbookSubjectKind) {
  return subjectKind === 'member'
    ? 'member_guestbook_entries'
    : 'celeb_guestbook_entries'
}

export async function markGuestbookRead(
  subjectKind: GuestbookSubjectKind,
  entryId: string
): Promise<void> {
  await requireAdmin()
  const admin = createAdminClient()
  const { error } = await admin
    .from(guestbookTable(subjectKind))
    .update({ is_read: true })
    .eq('id', entryId)

  if (error) throw new Error(`Failed to mark guestbook entry as read: ${error.message}`)
  revalidatePath('/guestbooks')
}

export async function deleteGuestbookEntry(
  subjectKind: GuestbookSubjectKind,
  entryId: string
): Promise<void> {
  await requireAdmin()
  const admin = createAdminClient()
  const { error } = await admin
    .from(guestbookTable(subjectKind))
    .delete()
    .eq('id', entryId)

  if (error) throw new Error(`Failed to delete guestbook entry: ${error.message}`)
  revalidatePath('/guestbooks')
}
