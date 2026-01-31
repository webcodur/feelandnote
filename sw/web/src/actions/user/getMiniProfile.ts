'use server'

import { createClient } from '@/lib/supabase/server'
import { type ActionResult, failure } from '@/lib/errors'

export interface MiniProfile {
  id: string
  nickname: string
  avatar_url: string | null
  selected_title: { name: string; grade: string } | null
  content_count: number
  follower_count: number
  is_following: boolean
  is_self: boolean
}

export async function getMiniProfile(userId: string): Promise<ActionResult<MiniProfile>> {
  const supabase = await createClient()

  const { data: { user: currentUser } } = await supabase.auth.getUser()

  // 프로필 조회
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select(`
      id, nickname, avatar_url,
      selected_title:titles!profiles_selected_title_id_fkey (name, grade)
    `)
    .eq('id', userId)
    .single()

  if (profileError || !profile) {
    return failure('NOT_FOUND', '사용자를 찾을 수 없다.')
  }

  // 병렬 조회: 콘텐츠 수, 팔로워 수, 팔로우 상태
  const [contentResult, followerResult, followResult] = await Promise.all([
    supabase.from('user_contents').select('*', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', userId),
    currentUser && currentUser.id !== userId
      ? supabase.from('follows').select('id').eq('follower_id', currentUser.id).eq('following_id', userId).single()
      : Promise.resolve({ data: null }),
  ])

  const selectedTitle = profile.selected_title
    ? (Array.isArray(profile.selected_title) ? profile.selected_title[0] : profile.selected_title)
    : null

  return {
    success: true,
    data: {
      id: profile.id,
      nickname: profile.nickname || '익명',
      avatar_url: profile.avatar_url,
      selected_title: selectedTitle as MiniProfile['selected_title'],
      content_count: contentResult.count || 0,
      follower_count: followerResult.count || 0,
      is_following: !!followResult.data,
      is_self: currentUser?.id === userId,
    },
  }
}
