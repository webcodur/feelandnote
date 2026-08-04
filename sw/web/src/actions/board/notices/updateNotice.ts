'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath, revalidateTag } from 'next/cache'
import { type ActionResult, failure, success, handleSupabaseError } from '@/lib/errors'
import type { NoticeWithAuthor } from '@/types/database'
import { checkAdmin } from '@/lib/auth/checkAdmin'

interface UpdateNoticeParams {
  id: string
  title: string
  content: string
  titleEn: string
  contentEn: string
  is_pinned?: boolean
}

export async function updateNotice(params: UpdateNoticeParams): Promise<ActionResult<NoticeWithAuthor>> {
  const { id, title, content, titleEn, contentEn, is_pinned } = params
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
  if (titleEn.trim().length === 0 || contentEn.trim().length === 0) {
    return failure('VALIDATION_ERROR', '영문 제목과 내용을 입력해달라.')
  }
  if (titleEn.length > 100) {
    return failure('LIMIT_EXCEEDED', '영문 제목은 100자까지 작성할 수 있다.')
  }

  const { data, error } = await supabase
    .from('notices')
    .update({
      title: title.trim(),
      content: content.trim(),
      title_en: titleEn.trim(),
      content_en: contentEn.trim(),
      is_pinned: is_pinned ?? false,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select(`*, author:profiles!author_id(id, nickname, avatar_url)`)
    .single()

  if (error) {
    return handleSupabaseError(error, { logPrefix: '[공지사항 수정]' })
  }

  revalidatePath('/agora/board/notice')
  revalidatePath('/en/agora/board/notice')
  revalidatePath(`/agora/board/notice/${id}`)
  revalidatePath(`/en/agora/board/notice/${id}`)
  revalidateTag('notices', { expire: 0 })
  return success(data as NoticeWithAuthor)
}
