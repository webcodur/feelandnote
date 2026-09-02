'use server'

import { createClient } from '@/lib/db/server'
import { revalidatePath, revalidateTag } from 'next/cache'
import { type ActionResult, failure, success, handleDatabaseError } from '@/lib/errors'
import type { BoardCommentWithAuthor, BoardType } from '@/types/database'
import { isLocale, type Locale } from '@/types/locale'
import { attachMemberAuthor } from '@/lib/board/memberProfiles'

interface CreateCommentParams {
  boardType: BoardType
  postId: string
  content: string
  locale: Locale
}

export async function createComment(params: CreateCommentParams): Promise<ActionResult<BoardCommentWithAuthor>> {
  const { boardType, postId, content, locale } = params
  const db = await createClient()

  if (!isLocale(locale)) {
    return failure('VALIDATION_ERROR')
  }

  const { data: { user } } = await db.auth.getUser()
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
    ? db.from('notices').select('id').eq('id', postId).maybeSingle()
    : db.from('feedbacks').select('id').eq('id', postId).eq('locale', locale).maybeSingle()
  const { data: parent } = await parentQuery
  if (!parent) {
    return failure('NOT_FOUND')
  }

  const { data, error } = await db
    .from('board_comments')
    .insert({
      board_type: boardType,
      post_id: postId,
      author_id: user.id,
      content: content.trim(),
      locale
    })
    .select('*')
    .single()

  if (error) {
    return handleDatabaseError(error, { logPrefix: '[댓글 작성]' })
  }

  const basePath = boardType === 'NOTICE' ? '/agora/board/notice' : '/agora/board/feedback'
  revalidatePath(`${basePath}/${postId}`)
  revalidatePath(`/en${basePath}/${postId}`)
  revalidateTag('board-comments', { expire: 0 })

  const comment = await attachMemberAuthor(db, data)
  return success(comment as BoardCommentWithAuthor)
}
