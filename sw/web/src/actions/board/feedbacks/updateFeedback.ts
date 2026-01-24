'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { type ActionResult, failure, success, handleSupabaseError } from '@/lib/errors'
import type { FeedbackWithAuthor } from '@/types/database'

interface UpdateFeedbackParams {
  id: string
  title?: string
  content?: string
}

export async function updateFeedback(params: UpdateFeedbackParams): Promise<ActionResult<FeedbackWithAuthor>> {
  const { id, title, content } = params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return failure('UNAUTHORIZED')
  }

  // 본인 글이고 PENDING 상태인지 확인
  const { data: existing } = await supabase
    .from('feedbacks')
    .select('author_id, status')
    .eq('id', id)
    .single()

  if (!existing) {
    return failure('NOT_FOUND', '피드백을 찾을 수 없다.')
  }

  if (existing.author_id !== user.id) {
    return failure('FORBIDDEN', '본인 글만 수정할 수 있다.')
  }

  if (existing.status !== 'PENDING') {
    return failure('FORBIDDEN', '처리 중인 피드백은 수정할 수 없다.')
  }

  const updates: Record<string, string> = {}
  if (title !== undefined) {
    if (title.trim().length === 0) {
      return failure('VALIDATION_ERROR', '제목을 입력해달라.')
    }
    if (title.length > 100) {
      return failure('LIMIT_EXCEEDED', '제목은 100자까지 작성할 수 있다.')
    }
    updates.title = title.trim()
  }

  if (content !== undefined) {
    if (content.trim().length === 0) {
      return failure('VALIDATION_ERROR', '내용을 입력해달라.')
    }
    if (content.length > 2000) {
      return failure('LIMIT_EXCEEDED', '내용은 2000자까지 작성할 수 있다.')
    }
    updates.content = content.trim()
  }

  const { data, error } = await supabase
    .from('feedbacks')
    .update(updates)
    .eq('id', id)
    .select(`
      *,
      author:profiles!author_id(id, nickname, avatar_url)
    `)
    .single()

  if (error) {
    return handleSupabaseError(error, { logPrefix: '[피드백 수정]' })
  }

  revalidatePath('/board/feedback')
  revalidatePath(`/board/feedback/${id}`)

  return success(data as FeedbackWithAuthor)
}
