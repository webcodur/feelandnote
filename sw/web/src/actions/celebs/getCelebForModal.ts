'use server'

import { createClient } from '@/lib/supabase/server'
import type { CelebProfile, CelebInfluence, CelebTagInfo } from '@/types/home'
import { getCelebLevelByRanking } from '@/constants/materials'

export async function getCelebForModal(celebId: string): Promise<CelebProfile | null> {
  const supabase = await createClient()
  const { data: { user: currentUser } } = await supabase.auth.getUser()

  // 프로필 조회
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', celebId)
    .eq('profile_type', 'CELEB')
    .eq('status', 'active')
    .single()

  if (error || !profile) return null

  // 병렬 조회
  const [contentResult, followerResult, followResult, influenceResult, tagsResult] = await Promise.all([
    supabase.from('user_contents').select('*', { count: 'exact', head: true }).eq('user_id', celebId),
    supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', celebId),
    currentUser
      ? supabase.from('follows').select('id').eq('follower_id', currentUser.id).eq('following_id', celebId).single()
      : Promise.resolve({ data: null }),
    supabase.from('celeb_influence').select('total_score').eq('celeb_id', celebId).maybeSingle(),
    supabase
      .from('celeb_tag_assignments')
      .select('short_desc, long_desc, tag:celeb_tags(id, name, color)')
      .eq('celeb_id', celebId),
  ])

  // 팔로워 여부 (상대방이 나를 팔로우하는지)
  const followerCheck = currentUser
    ? await supabase.from('follows').select('id').eq('follower_id', celebId).eq('following_id', currentUser.id).single()
    : { data: null }

  // 태그 정보 변환
  const tags: CelebTagInfo[] = (tagsResult.data || [])
    .filter((t): t is typeof t & { tag: { id: string; name: string; color: string } } => t.tag !== null)
    .map((t) => ({
      id: (t.tag as { id: string }).id,
      name: (t.tag as { name: string }).name,
      color: (t.tag as { color: string }).color,
      short_desc: t.short_desc,
      long_desc: t.long_desc,
    }))

  // 영향력 정보 (total_score만 사용, level은 placeholder)
  const influence: CelebInfluence | null = influenceResult.data?.total_score
    ? {
        total_score: influenceResult.data.total_score,
        level: getCelebLevelByRanking(1, 1), // placeholder - 실제 aura는 getAuraByScore로 계산됨
        ranking: undefined,
        percentile: undefined,
      }
    : null

  return {
    id: profile.id,
    nickname: profile.nickname || '익명',
    avatar_url: profile.avatar_url,
    portrait_url: profile.portrait_url,
    profession: profile.profession,
    title: profile.title,
    consumption_philosophy: profile.consumption_philosophy,
    nationality: profile.nationality,
    birth_date: profile.birth_date,
    death_date: profile.death_date,
    bio: profile.bio,
    quotes: profile.quotes,
    is_verified: profile.is_verified || false,
    is_platform_managed: profile.claimed_by === null,
    follower_count: followerResult.count || 0,
    content_count: contentResult.count || 0,
    is_following: !!followResult.data,
    is_follower: !!followerCheck.data,
    influence,
    tags,
  }
}
