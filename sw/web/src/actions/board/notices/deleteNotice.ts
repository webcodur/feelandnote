'use server'

import { createClient } from '@/lib/db/server'
import { revalidatePath, revalidateTag } from 'next/cache'
import { type ActionResult, success, handleDatabaseError } from '@/lib/errors'
import { checkAdmin } from '@/lib/auth/checkAdmin'

export async function deleteNotice(id: string): Promise<ActionResult<null>> {
  const db = await createClient()

  const adminCheck = await checkAdmin(db)
  if (!adminCheck.success) return adminCheck

  const { error } = await db
    .from('notices')
    .delete()
    .eq('id', id)

  if (error) {
    return handleDatabaseError(error, { logPrefix: '[공지사항 삭제]' })
  }

  revalidatePath('/agora/board/notice')
  revalidatePath('/en/agora/board/notice')
  revalidateTag('notices', { expire: 0 })

  return success(null)
}
