'use server'

import { createClient } from '@/lib/supabase/server'
import type { CelebProfile } from '@/types/home'

interface GetCelebsParams {
  limit?: number
}

interface GetCelebsResult {
  celebs: CelebProfile[]
  error: string | null
}

export async function getCelebs(
  params: GetCelebsParams = {}
): Promise<GetCelebsResult> {
  const { limit = 20 } = params

  const supabase = await createClient()

  // 셀럽 프로필과 팔로워 수를 함께 조회
  const { data, error } = await supabase
    .from('profiles')
    .select(`
      id,
      nickname,
      avatar_url,
      category,
      bio,
      is_verified,
      user_social(follower_count)
    `)
    .eq('profile_type', 'CELEB')
    .eq('status', 'active')
    .limit(limit)

  if (error) {
    console.error('셀럽 목록 조회 에러:', error)
    return { celebs: [], error: error.message }
  }

  // user_social 조인 결과를 평탄화하고 follower_count로 정렬
  const celebs: CelebProfile[] = (data || [])
    .map(row => {
      const social = Array.isArray(row.user_social)
        ? row.user_social[0]
        : row.user_social

      return {
        id: row.id,
        nickname: row.nickname || '',
        avatar_url: row.avatar_url,
        category: row.category,
        bio: row.bio,
        is_verified: row.is_verified ?? false,
        follower_count: social?.follower_count ?? 0,
      }
    })
    .sort((a, b) => b.follower_count - a.follower_count)

  return { celebs, error: null }
}
