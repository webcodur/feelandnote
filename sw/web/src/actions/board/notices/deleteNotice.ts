'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath, revalidateTag } from 'next/cache'
import { type ActionResult, success, handleSupabaseError } from '@/lib/errors'
import { checkAdmin } from '@/lib/auth/checkAdmin'

export async function deleteNotice(id: string): Promise<ActionResult<null>> {
  const supabase = await createClient()

  const adminCheck = await checkAdmin(supabase)
  if (!adminCheck.success) return adminCheck

  const { error } = await supabase
    .from('notices')
    .delete()
    .eq('id', id)

  if (error) {
    return handleSupabaseError(error, { logPrefix: '[공지사항 삭제]' })
  }

  revalidatePath('/agora/board/notice')
  revalidatePath('/en/agora/board/notice')
  revalidateTag('notices', { expire: 0 })

  return success(null)
}
