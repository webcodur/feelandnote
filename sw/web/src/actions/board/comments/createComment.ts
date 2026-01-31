'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { type ActionResult, failure, success, handleSupabaseError } from '@/lib/errors'
import type { BoardCommentWithAuthor, BoardType } from '@/types/database'

interface CreateCommentParams {
  boardType: BoardType
  postId: string
  content: string
}

export async function createComment(params: CreateCommentParams): Promise<ActionResult<BoardCommentWithAuthor>> {
  const { boardType, postId, content } = params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return failure('UNAUTHORIZED')
  }

  if (content.trim().length === 0) {
    return failure('VALIDATION_ERROR', '내용을 입력해달라.')
  }
  if (content.length > 500) {
    return failure('LIMIT_EXCEEDED', '댓글은 500자까지 작성할 수 있다.')
  }

  const { data, error } = await supabase
    .from('board_comments')
    .insert({
      board_type: boardType,
      post_id: postId,
      author_id: user.id,
      content: content.trim()
    })
    .select(`*, author:profiles!author_id(id, nickname, avatar_url)`)
    .single()

  if (error) {
    return handleSupabaseError(error, { logPrefix: '[댓글 작성]' })
  }

  const basePath = boardType === 'NOTICE' ? '/lounge/board/notice' : '/lounge/board/feedback'
  revalidatePath(`${basePath}/${postId}`)

  return success(data as BoardCommentWithAuthor)
}
