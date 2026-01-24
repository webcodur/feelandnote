'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { type ActionResult, failure, success, handleSupabaseError } from '@/lib/errors'
import type { FeedbackCategory, FeedbackWithAuthor } from '@/types/database'

interface CreateFeedbackParams {
  category: FeedbackCategory
  title: string
  content: string
}

export async function createFeedback(params: CreateFeedbackParams): Promise<ActionResult<FeedbackWithAuthor>> {
  const { category, title, content } = params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return failure('UNAUTHORIZED')
  }

  if (title.trim().length === 0) {
    return failure('VALIDATION_ERROR', '제목을 입력해달라.')
  }

  if (title.length > 100) {
    return failure('LIMIT_EXCEEDED', '제목은 100자까지 작성할 수 있다.')
  }

  if (content.trim().length === 0) {
    return failure('VALIDATION_ERROR', '내용을 입력해달라.')
  }

  if (content.length > 2000) {
    return failure('LIMIT_EXCEEDED', '내용은 2000자까지 작성할 수 있다.')
  }

  const { data, error } = await supabase
    .from('feedbacks')
    .insert({
      author_id: user.id,
      category,
      title: title.trim(),
      content: content.trim()
    })
    .select(`
      *,
      author:profiles!author_id(id, nickname, avatar_url)
    `)
    .single()

  if (error) {
    return handleSupabaseError(error, { context: 'feedback', logPrefix: '[피드백 작성]' })
  }

  revalidatePath('/board/feedback')

  return success(data as FeedbackWithAuthor)
}
