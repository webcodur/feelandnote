'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export interface Record {
  id: string
  user_id: string
  content_id: string
  type: string
  content: string
  visibility: string
  location: string | null
  source_url: string | null
  created_at: string
  updated_at: string
  user: {
    id: string
    nickname: string | null
    email: string | null
    avatar_url: string | null
  } | null
  content_info: {
    id: string
    title: string
    type: string
    thumbnail_url: string | null
  } | null
  like_count: number
  comment_count: number
}

interface RawRecordUser {
  id: string
  nickname: string | null
  avatar_url: string | null
  user_accounts: { email: string | null } | { email: string | null }[] | null
}

function toRecordUser(raw: unknown): Record['user'] {
  const person = raw as RawRecordUser | null
  if (!person) return null
  const account = Array.isArray(person.user_accounts)
    ? person.user_accounts[0] ?? null
    : person.user_accounts
  return {
    id: person.id,
    nickname: person.nickname,
    email: account?.email ?? null,
    avatar_url: person.avatar_url,
  }
}

export async function getRecord(recordId: string): Promise<Record | null> {
  const supabase = await createClient()

  // 이메일은 26.08.07에 계정 기록(user_accounts)으로 갈라졌다. 붙여 읽고 평평하게 편다.
  const { data: record, error } = await supabase
    .from('records')
    .select(`
      *,
      profiles:user_id (id, nickname, avatar_url, user_accounts(email)),
      contents:content_id (id, type, content_locales(locale, title, thumbnail_url))
    `)
    .eq('id', recordId)
    .single()

  if (error || !record) return null

  // 좋아요 수
  const { count: likeCount } = await supabase
    .from('record_likes')
    .select('*', { count: 'exact', head: true })
    .eq('record_id', recordId)

  // 댓글 수
  const { count: commentCount } = await supabase
    .from('record_comments')
    .select('*', { count: 'exact', head: true })
    .eq('record_id', recordId)

  // content_locales에서 ko/en fallback
  const rawContent = record.contents as { id: string; type: string; content_locales: { locale: string; title: string; thumbnail_url: string | null }[] } | null
  const koLocale = rawContent?.content_locales?.find((l) => l.locale === 'ko')
  const enLocale = rawContent?.content_locales?.find((l) => l.locale === 'en')
  const contentInfo = rawContent ? {
    id: rawContent.id,
    title: koLocale?.title || enLocale?.title || '',
    type: rawContent.type,
    thumbnail_url: koLocale?.thumbnail_url || enLocale?.thumbnail_url || null,
  } : null

  return {
    id: record.id,
    user_id: record.user_id,
    content_id: record.content_id,
    type: record.type,
    content: record.content,
    visibility: record.visibility,
    location: record.location,
    source_url: record.source_url,
    created_at: record.created_at,
    updated_at: record.updated_at,
    user: toRecordUser(record.profiles),
    content_info: contentInfo,
    like_count: likeCount || 0,
    comment_count: commentCount || 0,
  }
}

export async function getRecordComments(recordId: string) {
  const supabase = await createClient()

  const { data: comments } = await supabase
    .from('record_comments')
    .select(`
      id,
      content,
      created_at,
      profiles:user_id (nickname, avatar_url)
    `)
    .eq('record_id', recordId)
    .order('created_at', { ascending: true })

  return comments || []
}

export async function deleteRecord(recordId: string): Promise<void> {
  const admin = createAdminClient()

  // 관련 데이터 삭제 (RLS 우회 필요)
  await admin.from('record_likes').delete().eq('record_id', recordId)
  await admin.from('record_comments').delete().eq('record_id', recordId)

  const { error } = await admin
    .from('records')
    .delete()
    .eq('id', recordId)

  if (error) throw error

  revalidatePath('/records')
}

export async function updateRecordVisibility(
  recordId: string,
  visibility: 'public' | 'followers' | 'private'
): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('records')
    .update({ visibility })
    .eq('id', recordId)

  if (error) throw error

  revalidatePath('/records')
  revalidatePath(`/records/${recordId}`)
}
