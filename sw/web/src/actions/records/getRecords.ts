'use server'

import { createClient } from '@/lib/supabase/server'
import type { RecordType } from './createRecord'

interface GetRecordsParams {
  userId?: string  // 특정 사용자/셀럽의 기록 조회
  contentId?: string
  type?: RecordType
  limit?: number
  offset?: number
}

export async function getRecords(params: GetRecordsParams = {}) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  // userId가 지정되지 않으면 현재 사용자의 기록 조회
  const targetUserId = params.userId ?? user?.id
  if (!targetUserId) {
    throw new Error('로그인이 필요합니다')
  }

  // 본인이 아닌 경우 셀럽 프로필인지 확인
  if (params.userId && params.userId !== user?.id) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('profile_type')
      .eq('id', params.userId)
      .single()

    if (profile?.profile_type !== 'CELEB') {
      throw new Error('접근 권한이 없습니다')
    }
  }

  let query = supabase
    .from('records')
    .select(`
      *,
      contentData:contents(id, title, type, thumbnail_url, creator),
      contributor:profiles!records_contributor_id_fkey(id, nickname, avatar_url)
    `)
    .eq('user_id', targetUserId)
    .order('created_at', { ascending: false })

  if (params.contentId) {
    query = query.eq('content_id', params.contentId)
  }

  if (params.type) {
    query = query.eq('type', params.type)
  }

  if (params.limit) {
    query = query.limit(params.limit)
  }

  if (params.offset) {
    query = query.range(params.offset, params.offset + (params.limit || 20) - 1)
  }

  const { data, error } = await query

  if (error) {
    console.error('Get records error:', error)
    throw new Error('기록 조회에 실패했습니다')
  }

  return data
}

export async function getRecord(recordId: string, userId?: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const targetUserId = userId ?? user?.id

  if (!targetUserId) {
    throw new Error('로그인이 필요합니다')
  }

  // 본인이 아닌 경우 셀럽 프로필인지 확인
  if (userId && userId !== user?.id) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('profile_type')
      .eq('id', userId)
      .single()

    if (profile?.profile_type !== 'CELEB') {
      throw new Error('접근 권한이 없습니다')
    }
  }

  const { data, error } = await supabase
    .from('records')
    .select(`
      *,
      contentData:contents(id, title, type, thumbnail_url, creator),
      contributor:profiles!records_contributor_id_fkey(id, nickname, avatar_url)
    `)
    .eq('id', recordId)
    .eq('user_id', targetUserId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      throw new Error('기록을 찾을 수 없습니다')
    }
    console.error('Get record error:', error)
    throw new Error('기록 조회에 실패했습니다')
  }

  return data
}
