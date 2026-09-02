'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/db/server'
import { createAdminClient } from '@/lib/db/admin'
import { type ActionResult, failure, success, handleDatabaseError } from '@/lib/errors'
import { canMutateFree } from '@/lib/board/freeAuth'
import { FREE_POST_COLS, FREE_BOARD_PATH } from '@/lib/board/freeBoard'
import { attachMemberAuthor } from '@/lib/board/memberProfiles'
import type { FreePost } from '@/types/database'

interface UpdateFreePostParams {
  id: string
  title: string
  content: string
  password?: string
}

export async function updateFreePost(params: UpdateFreePostParams): Promise<ActionResult<FreePost>> {
  const { id, title, content, password } = params

  if (title.trim().length === 0) return failure('VALIDATION_ERROR', '제목을 입력해달라.')
  if (title.length > 100) return failure('LIMIT_EXCEEDED', '제목은 100자까지 작성할 수 있다.')
  if (content.trim().length === 0) return failure('VALIDATION_ERROR', '내용을 입력해달라.')
  if (content.length > 5000) return failure('LIMIT_EXCEEDED', '내용은 5000자까지 작성할 수 있다.')

  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  const db = createAdminClient()

  const { data: row, error: fetchError } = await db
    .from('free_posts')
    .select('author_id, password_hash, is_deleted')
    .eq('id', id)
    .single()

  if (fetchError || !row) return failure('NOT_FOUND')
  const target = row as { author_id: string | null; password_hash: string | null; is_deleted: boolean }
  if (target.is_deleted) return failure('NOT_FOUND')

  const allowed = await canMutateFree(target, user, password, authClient)
  if (!allowed) {
    return target.author_id ? failure('FORBIDDEN') : failure('FORBIDDEN', '비밀번호가 일치하지 않는다.')
  }

  const { data, error } = await db
    .from('free_posts')
    .update({ title: title.trim(), content: content.trim(), updated_at: new Date().toISOString() })
    .eq('id', id)
    .select(FREE_POST_COLS)
    .single()

  if (error) return handleDatabaseError(error, { logPrefix: '[자유게시판 수정]' })

  revalidatePath(FREE_BOARD_PATH)
  revalidatePath(`/en${FREE_BOARD_PATH}`)
  revalidatePath(`${FREE_BOARD_PATH}/${id}`)
  revalidatePath(`/en${FREE_BOARD_PATH}/${id}`)
  const post = await attachMemberAuthor(db, data)
  return success(post as unknown as FreePost)
}
