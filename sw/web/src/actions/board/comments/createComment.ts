'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath, revalidateTag } from 'next/cache'
import { type ActionResult, failure, success, handleSupabaseError } from '@/lib/errors'
import type { BoardCommentWithAuthor, BoardType } from '@/types/database'
import { isLocale, type Locale } from '@/types/locale'

interface CreateCommentParams {
  boardType: BoardType
  postId: string
  content: string
  locale: Locale
}

export async function createComment(params: CreateCommentParams): Promise<ActionResult<BoardCommentWithAuthor>> {
  const { boardType, postId, content, locale } = params
  const supabase = await createClient()

  if (!isLocale(locale)) {
    return failure('VALIDATION_ERROR')
  }

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

  const parentQuery = boardType === 'NOTICE'
    ? supabase.from('notices').select('id').eq('id', postId).maybeSingle()
    : supabase.from('feedbacks').select('id').eq('id', postId).eq('locale', locale).maybeSingle()
  const { data: parent } = await parentQuery
  if (!parent) {
    return failure('NOT_FOUND')
  }

  const { data, error } = await supabase
    .from('board_comments')
    .insert({
      board_type: boardType,
      post_id: postId,
      author_id: user.id,
      content: content.trim(),
      locale
    })
    .select(`*, author:profiles!author_id(id, nickname, avatar_url)`)
    .single()

  if (error) {
    return handleSupabaseError(error, { logPrefix: '[댓글 작성]' })
  }

  const basePath = boardType === 'NOTICE' ? '/agora/board/notice' : '/agora/board/feedback'
  revalidatePath(`${basePath}/${postId}`)
  revalidatePath(`/en${basePath}/${postId}`)
  revalidateTag('board-comments', { expire: 0 })

  return success(data as BoardCommentWithAuthor)
}
