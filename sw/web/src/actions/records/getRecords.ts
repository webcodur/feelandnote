'use server'

import { createClient } from '@/lib/supabase/server'
import type { RecordType } from './createRecord'

interface GetRecordsParams {
  contentId?: string
  type?: RecordType
  limit?: number
  offset?: number
}

export async function getRecords(params: GetRecordsParams = {}) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('로그인이 필요합니다')
  }

  let query = supabase
    .from('records')
    .select(`
      *,
      contentData:contents(id, title, type, thumbnail_url, creator)
    `)
    .eq('user_id', user.id)
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

export async function getRecord(recordId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('로그인이 필요합니다')
  }

  const { data, error } = await supabase
    .from('records')
    .select(`
      *,
      contentData:contents(id, title, type, thumbnail_url, creator)
    `)
    .eq('id', recordId)
    .eq('user_id', user.id)
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
