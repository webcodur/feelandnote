'use server'

import { createClient } from '@/lib/supabase/server'
import type { RecordType } from './createRecord'

export interface FeedRecord {
  id: string
  content: string
  rating: number | null
  type: RecordType
  created_at: string
  location: string | null
  user: {
    id: string
    nickname: string
    avatar_url: string | null
    selected_title: { id: string; name: string; grade: string } | null
  }
}

interface GetFeedRecordsParams {
  contentId: string
  type?: RecordType
  limit?: number
  offset?: number
}

export async function getFeedRecords(params: GetFeedRecordsParams): Promise<FeedRecord[]> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  let query = supabase
    .from('records')
    .select(`
      id,
      content,
      rating,
      type,
      created_at,
      location,
      user:profiles!records_user_id_fkey(
        id,
        nickname,
        avatar_url,
        selected_title:titles!profiles_selected_title_id_fkey(id, name, grade)
      )
    `)
    .eq('content_id', params.contentId)
    .order('created_at', { ascending: false })

  // 로그인한 사용자가 있으면 본인 기록 제외
  if (user) {
    query = query.neq('user_id', user.id)
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
    console.error('Get feed records error:', error)
    return []
  }

  return (data || []).map(record => ({
    ...record,
    user: Array.isArray(record.user) ? record.user[0] : record.user
  })) as FeedRecord[]
}
