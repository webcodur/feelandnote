'use server'

import { createClient } from '@/lib/supabase/server'
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

export async function getRecord(recordId: string): Promise<Record | null> {
  const supabase = await createClient()

  const { data: record, error } = await supabase
    .from('records')
    .select(`
      *,
      profiles:user_id (id, nickname, email, avatar_url),
      contents:content_id (id, title, type, thumbnail_url)
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
    user: record.profiles as Record['user'],
    content_info: record.contents as Record['content_info'],
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
  const supabase = await createClient()

  // 관련 데이터 삭제
  await supabase.from('record_likes').delete().eq('record_id', recordId)
  await supabase.from('record_comments').delete().eq('record_id', recordId)

  const { error } = await supabase
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
