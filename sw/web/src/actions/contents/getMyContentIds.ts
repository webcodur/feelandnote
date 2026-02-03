'use server'

import { createClient } from '@/lib/supabase/server'
import type { ContentStatus } from '@/types/database'

// 사용자가 저장한 콘텐츠의 ID 목록만 가져온다 (가벼운 조회)
export async function getMyContentIds(): Promise<string[]> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('user_contents')
    .select('content_id')
    .eq('user_id', user.id)

  if (error) {
    console.error('콘텐츠 ID 조회 에러:', error)
    return []
  }

  return data?.map((item) => item.content_id) || []
}

// 특정 콘텐츠가 저장되어 있는지 확인
export async function checkContentSaved(contentId: string): Promise<{
  saved: boolean
  userContentId?: string
  status?: ContentStatus
}> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { saved: false }

  const { data, error } = await supabase
    .from('user_contents')
    .select('id, status')
    .eq('user_id', user.id)
    .eq('content_id', contentId)
    .single()

  if (error || !data) return { saved: false }

  return {
    saved: true,
    userContentId: data.id,
    status: data.status as ContentStatus,
  }
}

// 여러 콘텐츠의 저장 상태를 한 번에 확인 (배치 조회)
export async function checkContentsSaved(contentIds: string[]): Promise<Set<string>> {
  if (contentIds.length === 0) return new Set()

  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Set()

  const { data, error } = await supabase
    .from('user_contents')
    .select('content_id')
    .eq('user_id', user.id)
    .in('content_id', contentIds)

  if (error || !data) return new Set()

  return new Set(data.map((item) => item.content_id))
}
