'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { type ActionResult, failure, success, handleSupabaseError } from '@/lib/errors'
import type { NoticeWithAuthor } from '@/types/database'
import { checkAdmin } from '@/lib/auth/checkAdmin'

interface CreateNoticeParams {
  title: string
  content: string
  is_pinned?: boolean
}

export async function createNotice(params: CreateNoticeParams): Promise<ActionResult<NoticeWithAuthor>> {
  const { title, content, is_pinned = false } = params
  const supabase = await createClient()

  const adminCheck = await checkAdmin(supabase)
  if (!adminCheck.success) return adminCheck

  if (title.trim().length === 0) {
    return failure('VALIDATION_ERROR', '제목을 입력해달라.')
  }
  if (title.length > 100) {
    return failure('LIMIT_EXCEEDED', '제목은 100자까지 작성할 수 있다.')
  }
  if (content.trim().length === 0) {
    return failure('VALIDATION_ERROR', '내용을 입력해달라.')
  }

  const { data, error } = await supabase
    .from('notices')
    .insert({
      author_id: adminCheck.userId,
      title: title.trim(),
      content: content.trim(),
      is_pinned
    })
    .select(`*, author:profiles!author_id(id, nickname, avatar_url)`)
    .single()

  if (error) {
    return handleSupabaseError(error, { logPrefix: '[공지사항 작성]' })
  }

  revalidatePath('/lounge/board/notice')
  return success(data as NoticeWithAuthor)
}
