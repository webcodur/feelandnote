'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/db/server'
import { createAdminClient } from '@/lib/db/admin'
import { type ActionResult, failure, success, handleDatabaseError } from '@/lib/errors'
import { canMutateFree } from '@/lib/board/freeAuth'
import { FREE_BOARD_PATH } from '@/lib/board/freeBoard'

interface DeleteFreePostParams {
  id: string
  password?: string
}

// 본인 삭제: 계정 글은 본인/관리자, 익명 글은 비밀번호 대조 후 완전 삭제(댓글 연쇄 삭제)
export async function deleteFreePost(params: DeleteFreePostParams): Promise<ActionResult<null>> {
  const { id, password } = params

  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  const db = createAdminClient()

  const { data: row, error: fetchError } = await db
    .from('free_posts')
    .select('author_id, password_hash')
    .eq('id', id)
    .single()

  if (fetchError || !row) return failure('NOT_FOUND')
  const target = row as { author_id: string | null; password_hash: string | null }

  const allowed = await canMutateFree(target, user, password, authClient)
  if (!allowed) {
    return target.author_id ? failure('FORBIDDEN') : failure('FORBIDDEN', '비밀번호가 일치하지 않는다.')
  }

  const { error } = await db.from('free_posts').delete().eq('id', id)
  if (error) return handleDatabaseError(error, { logPrefix: '[자유게시판 삭제]' })

  revalidatePath(FREE_BOARD_PATH)
  revalidatePath(`/en${FREE_BOARD_PATH}`)
  return success(null)
}
