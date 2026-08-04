'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath, revalidateTag } from 'next/cache'
import { type ActionResult, failure, success, handleSupabaseError } from '@/lib/errors'
import { isAdmin } from '@/lib/auth/checkAdmin'
import type { BoardType } from '@/types/database'

interface DeleteCommentParams {
  commentId: string
  boardType: BoardType
  postId: string
}

export async function deleteComment(params: DeleteCommentParams): Promise<ActionResult<null>> {
  const { commentId, boardType, postId } = params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return failure('UNAUTHORIZED')
  }

  // 작성자 또는 관리자만 삭제 가능
  const { data: comment, error: fetchError } = await supabase
    .from('board_comments')
    .select('author_id')
    .eq('id', commentId)
    .single()

  if (fetchError || !comment) {
    return failure('NOT_FOUND')
  }

  if (comment.author_id !== user.id && !(await isAdmin(supabase))) {
    return failure('FORBIDDEN')
  }

  const { error } = await supabase
    .from('board_comments')
    .delete()
    .eq('id', commentId)

  if (error) {
    return handleSupabaseError(error, { logPrefix: '[댓글 삭제]' })
  }

  const basePath = boardType === 'NOTICE' ? '/agora/board/notice' : '/agora/board/feedback'
  revalidatePath(`${basePath}/${postId}`)
  revalidatePath(`/en${basePath}/${postId}`)
  revalidateTag('board-comments', { expire: 0 })

  return success(null)
}
