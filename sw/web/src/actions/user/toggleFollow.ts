'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { type ActionResult, failure, handleSupabaseError } from '@/lib/errors'

interface ToggleFollowData {
  isFollowing: boolean
}

export async function toggleFollow(targetUserId: string): Promise<ActionResult<ToggleFollowData>> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return failure('UNAUTHORIZED')
  }

  // 자기 자신 팔로우 방지
  if (user.id === targetUserId) {
    return failure('SELF_ACTION', '자기 자신을 팔로우할 수 없다.')
  }

  // 대상 사용자 존재 확인
  const { data: targetUser, error: targetError } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', targetUserId)
    .single()

  if (targetError || !targetUser) {
    return failure('NOT_FOUND', '사용자를 찾을 수 없다.')
  }

  // 현재 팔로우 상태 확인
  const { data: existingFollow } = await supabase
    .from('follows')
    .select('id')
    .eq('follower_id', user.id)
    .eq('following_id', targetUserId)
    .single()

  const isCurrentlyFollowing = !!existingFollow

  if (isCurrentlyFollowing) {
    // 언팔로우
    const { error } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', user.id)
      .eq('following_id', targetUserId)

    if (error) {
      return handleSupabaseError(error, { context: 'follow', logPrefix: '[언팔로우]' })
    }

    // user_social 카운트 감소
    await updateSocialCounts(supabase, user.id, targetUserId, -1)

    revalidatePath(`/archive/user/${targetUserId}`)
    return { success: true, data: { isFollowing: false } }
  }

  // 팔로우
  const { error } = await supabase
    .from('follows')
    .insert({
      follower_id: user.id,
      following_id: targetUserId,
    })

  if (error) {
    return handleSupabaseError(error, { context: 'follow', logPrefix: '[팔로우]' })
  }

  // user_social 카운트 증가
  await updateSocialCounts(supabase, user.id, targetUserId, 1)

  revalidatePath(`/archive/user/${targetUserId}`)
  return { success: true, data: { isFollowing: true } }
}

type SupabaseClient = Awaited<ReturnType<typeof createClient>>

// user_social 테이블 카운트 업데이트
async function updateSocialCounts(
  supabase: SupabaseClient,
  followerId: string,
  followingId: string,
  delta: number
) {
  // 팔로워의 following_count 업데이트
  await updateSingleCount(supabase, followerId, 'following_count', delta)

  // 팔로잉 대상의 follower_count 업데이트
  await updateSingleCount(supabase, followingId, 'follower_count', delta)

  // 친구 관계 확인 및 friend_count 업데이트
  await updateFriendCount(supabase, followerId, followingId, delta)
}

async function updateSingleCount(
  supabase: SupabaseClient,
  userId: string,
  column: 'follower_count' | 'following_count',
  delta: number
) {
  // 현재 값 조회
  const { data: current } = await supabase
    .from('user_social')
    .select('follower_count, following_count')
    .eq('user_id', userId)
    .single()

  if (current) {
    const currentValue = current[column] ?? 0
    await supabase
      .from('user_social')
      .update({ [column]: Math.max(0, currentValue + delta) })
      .eq('user_id', userId)
  } else {
    // 레코드가 없으면 생성
    await supabase
      .from('user_social')
      .insert({
        user_id: userId,
        follower_count: column === 'follower_count' ? Math.max(0, delta) : 0,
        following_count: column === 'following_count' ? Math.max(0, delta) : 0,
      })
  }
}

async function updateFriendCount(
  supabase: SupabaseClient,
  followerId: string,
  followingId: string,
  delta: number
) {
  // 상대방이 나를 팔로우하는지 확인 (맞팔 체크)
  const { data: reverseFollow } = await supabase
    .from('follows')
    .select('id')
    .eq('follower_id', followingId)
    .eq('following_id', followerId)
    .single()

  // 맞팔 상태면 양쪽 friend_count 업데이트
  if (reverseFollow) {
    for (const userId of [followerId, followingId]) {
      const { data: current } = await supabase
        .from('user_social')
        .select('friend_count')
        .eq('user_id', userId)
        .single()

      if (current) {
        const currentValue = current.friend_count ?? 0
        await supabase
          .from('user_social')
          .update({ friend_count: Math.max(0, currentValue + delta) })
          .eq('user_id', userId)
      }
    }
  }
}
