'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { type ActionResult, failure, success, handleSupabaseError } from '@/lib/errors'
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

  const { error } = await supabase
    .from('board_comments')
    .delete()
    .eq('id', commentId)

  if (error) {
    return handleSupabaseError(error, { logPrefix: '[댓글 삭제]' })
  }

  const basePath = boardType === 'NOTICE' ? '/lounge/board/notice' : '/lounge/board/feedback'
  revalidatePath(`${basePath}/${postId}`)

  return success(null)
}
