'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { type ActionResult, failure, success, handleSupabaseError } from '@/lib/errors'
import type { NoticeWithAuthor } from '@/types/database'
import { checkAdmin } from '@/lib/auth/checkAdmin'

interface UpdateNoticeParams {
  id: string
  title: string
  content: string
  is_pinned?: boolean
}

export async function updateNotice(params: UpdateNoticeParams): Promise<ActionResult<NoticeWithAuthor>> {
  const { id, title, content, is_pinned } = params
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
    .update({
      title: title.trim(),
      content: content.trim(),
      is_pinned: is_pinned ?? false,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select(`*, author:profiles!author_id(id, nickname, avatar_url)`)
    .single()

  if (error) {
    return handleSupabaseError(error, { logPrefix: '[공지사항 수정]' })
  }

  revalidatePath('/lounge/board/notice')
  revalidatePath(`/board/notice/${id}`)
  return success(data as NoticeWithAuthor)
}
