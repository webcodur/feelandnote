'use server'

import { createClient } from '@/lib/db/server'
import { revalidatePath, revalidateTag } from 'next/cache'
import { type ActionResult, failure, success, handleDatabaseError } from '@/lib/errors'
import type { NoticeWithAuthor } from '@/types/database'
import { checkAdmin } from '@/lib/auth/checkAdmin'
import { attachMemberAuthor } from '@/lib/board/memberProfiles'

interface CreateNoticeParams {
  title: string
  content: string
  titleEn: string
  contentEn: string
  is_pinned?: boolean
  /** 발행 시각. 비우면 지금 올라간다. 미래를 넣으면 그때까지 목록에 뜨지 않는다. */
  publishAt?: string | null
}

export async function createNotice(params: CreateNoticeParams): Promise<ActionResult<NoticeWithAuthor>> {
  const { title, content, titleEn, contentEn, is_pinned = false, publishAt = null } = params
  const db = await createClient()

  const adminCheck = await checkAdmin(db)
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

  // created_at이 곧 발행 시각이다 — 예약을 위해 컬럼을 따로 두지 않는다.
  let createdAt: string | null = null
  if (publishAt) {
    const parsed = new Date(publishAt)
    if (Number.isNaN(parsed.getTime())) {
      return failure('VALIDATION_ERROR', '발행 시각이 올바르지 않다.')
    }
    createdAt = parsed.toISOString()
  }

  const { data, error } = await db
    .from('notices')
    .insert({
      author_id: adminCheck.userId,
      title: title.trim(),
      content: content.trim(),
      title_en: titleEn.trim(),
      content_en: contentEn.trim(),
      is_pinned,
      ...(createdAt ? { created_at: createdAt } : {})
    })
    .select('*')
    .single()

  if (error) {
    return handleDatabaseError(error, { logPrefix: '[공지사항 작성]' })
  }

  revalidatePath('/agora/board/notice')
  revalidatePath('/en/agora/board/notice')
  revalidateTag('notices', { expire: 0 })
  const notice = await attachMemberAuthor(db, data)
  return success(notice as NoticeWithAuthor)
}
