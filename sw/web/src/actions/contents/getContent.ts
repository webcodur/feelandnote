'use server'

import { createClient } from '@/lib/supabase/server'
import type { Content } from '@/types/database'

export interface UserContentWithDetails {
  id: string
  user_id: string
  content_id: string
  status: string
  rating: number | null
  review: string | null
  is_spoiler: boolean | null
  created_at: string
  updated_at: string
  content: Content
  user?: {
    nickname: string | null
    avatar_url: string | null
  } | null
}

export async function getContent(contentId: string): Promise<UserContentWithDetails> {
  const supabase = await createClient()

  const {
    data: { user }
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('로그인이 필요합니다')
  }

  // 사용자의 콘텐츠 상태와 콘텐츠 정보를 조인해서 조회
  const { data, error } = await supabase
    .from('user_contents')
    .select(
      `
      *,
      content:contents(*)
    `
    )
    .eq('user_id', user.id)
    .eq('content_id', contentId)
    .single()

  if (error || !data) {
    throw new Error('콘텐츠를 찾을 수 없습니다')
  }

  return data as unknown as UserContentWithDetails
}

// 타인의 공개 콘텐츠 조회
export async function getPublicContent(contentId: string, userId: string): Promise<UserContentWithDetails> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('user_contents')
    .select(`
      *,
      content:contents(*),
      user:profiles!user_contents_user_id_fkey(nickname, avatar_url)
    `)
    .eq('user_id', userId)
    .eq('content_id', contentId)
    .eq('visibility', 'public')
    .single()

  if (error || !data) {
    throw new Error('콘텐츠를 찾을 수 없습니다')
  }

  // user가 배열로 올 수 있으므로 첫 번째 요소 추출
  const result = {
    ...data,
    user: Array.isArray(data.user) ? data.user[0] : data.user
  }

  return result as unknown as UserContentWithDetails
}
