'use server'

import { createClient } from '@/lib/supabase/server'
import type { ContentType, ContentStatus } from './addContent'

interface GetMyContentsParams {
  status?: ContentStatus
  type?: ContentType
}

export interface UserContentWithContent {
  id: string
  user_id: string
  content_id: string
  status: string
  progress: number | null
  progress_type: string | null
  created_at: string
  updated_at: string
  content: {
    id: string
    type: string
    title: string
    creator: string | null
    thumbnail_url: string | null
    description: string | null
    publisher: string | null
    release_date: string | null
    metadata: Record<string, unknown> | null
  }
}

export async function getMyContents(params: GetMyContentsParams = {}): Promise<UserContentWithContent[]> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('로그인이 필요합니다')
  }

  let query = supabase
    .from('user_contents')
    .select(`
      *,
      content:contents(*)
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (params.status) {
    query = query.eq('status', params.status)
  }

  const { data, error } = await query

  if (error) {
    console.error('콘텐츠 조회 에러:', error)
    throw new Error('콘텐츠 목록을 불러오는데 실패했습니다')
  }

  // content가 null인 항목 필터링 및 type 필터
  let result = (data || []).filter((item): item is UserContentWithContent =>
    item.content !== null
  )

  if (params.type) {
    result = result.filter((item) => item.content.type === params.type)
  }

  return result
}
