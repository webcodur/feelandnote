'use server'

import { createClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import { type ActionResult, failure, success, handleDatabaseError } from '@/lib/errors'

interface CreateGuestbookEntryParams {
  profileId: string
  subjectKind: 'member' | 'celeb'
  content: string
  isPrivate?: boolean
}

interface GuestbookEntryData {
  id: string
  profile_id: string
  author_id: string
  content: string
  is_private: boolean
  created_at: string
  author: {
    id: string
    nickname: string
    avatar_url: string | null
  }
}

export async function createGuestbookEntry(params: CreateGuestbookEntryParams): Promise<ActionResult<GuestbookEntryData>> {
  const { profileId, subjectKind, content, isPrivate = false } = params
  const db = await createClient()

  const { data: { user } } = await db.auth.getUser()
  if (!user) return failure('UNAUTHORIZED')

  if (content.length > 500) {
    return failure('LIMIT_EXCEEDED', '방명록은 500자까지 작성할 수 있다.')
  }
  if (content.trim().length === 0) {
    return failure('VALIDATION_ERROR', '내용을 입력해달라.')
  }

  const subjectResult = subjectKind === 'member'
    ? await db.from('member_profiles').select('id').eq('id', profileId).maybeSingle()
    : await db.from('celebs').select('id, slug').eq('id', profileId).maybeSingle()
  if (subjectResult.error || !subjectResult.data) {
    return failure('NOT_FOUND', '방명록 대상을 찾을 수 없다.')
  }

  const insertResult = subjectKind === 'member'
    ? await db
        .from('member_guestbook_entries')
        .insert({
          owner_member_id: profileId,
          author_member_id: user.id,
          content: content.trim(),
          is_private: isPrivate,
        })
        .select('id, owner_member_id, author_member_id, content, is_private, created_at')
        .single()
    : await db
        .from('celeb_guestbook_entries')
        .insert({
          celeb_id: profileId,
          author_member_id: user.id,
          content: content.trim(),
          // 인물은 로그인 소유자가 없어 회원 방명록의 비밀글 규칙을 쓰지 않는다.
          is_private: false,
        })
        .select('id, celeb_id, author_member_id, content, is_private, created_at')
        .single()

  if (insertResult.error || !insertResult.data) {
    return handleDatabaseError(insertResult.error!, { context: 'guestbook', logPrefix: '[방명록 작성]' })
  }

  const { data: author } = await db
    .from('member_profiles')
    .select('id, nickname, avatar_url')
    .eq('id', user.id)
    .single()
  if (!author) return failure('NOT_FOUND', '작성자 프로필을 찾을 수 없다.')

  const row = insertResult.data as unknown as {
    id: string
    owner_member_id?: string
    celeb_id?: string
    author_member_id: string
    content: string
    is_private: boolean
    created_at: string
  }

  revalidatePath('/profile/guestbook')
  if (subjectKind === 'member') {
    revalidatePath(`/${profileId}`)
  }
  const celebSlug = subjectKind === 'celeb' && 'slug' in subjectResult.data
    ? subjectResult.data.slug
    : null
  if (celebSlug) {
    revalidatePath(`/celeb/${celebSlug}`)
    revalidatePath(`/en/celeb/${celebSlug}`)
  }

  return success({
    id: row.id,
    profile_id: row.owner_member_id ?? row.celeb_id ?? profileId,
    author_id: row.author_member_id,
    content: row.content,
    is_private: row.is_private,
    created_at: row.created_at,
    author,
  })
}
