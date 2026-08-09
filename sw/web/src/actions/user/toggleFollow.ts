'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { type ActionResult, failure, handleSupabaseError } from '@/lib/errors'

interface ToggleFollowData {
  isFollowing: boolean
}

export type FollowTargetKind = 'member' | 'celeb'

export async function toggleFollow(
  targetUserId: string,
  targetKind: FollowTargetKind,
): Promise<ActionResult<ToggleFollowData>> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return failure('UNAUTHORIZED')
  }

  // 자기 자신 팔로우 방지
  if (targetKind === 'member' && user.id === targetUserId) {
    return failure('SELF_ACTION', '자기 자신을 팔로우할 수 없다.')
  }

  const targetResult = targetKind === 'member'
    ? await supabase.from('member_profiles').select('id').eq('id', targetUserId).maybeSingle()
    : await supabase.from('celebs').select('id, slug').eq('id', targetUserId).maybeSingle()

  if (targetResult.error || !targetResult.data) {
    return failure('NOT_FOUND', '사용자를 찾을 수 없다.')
  }

  const followTable = targetKind === 'member' ? 'member_member_follows' : 'member_celeb_follows'
  const followerColumn = targetKind === 'member' ? 'follower_member_id' : 'member_id'
  const followedColumn = targetKind === 'member' ? 'followed_member_id' : 'celeb_id'

  const { data: existingFollow } = await supabase
    .from(followTable)
    .select('id')
    .eq(followerColumn, user.id)
    .eq(followedColumn, targetUserId)
    .maybeSingle()

  const isCurrentlyFollowing = !!existingFollow

  if (isCurrentlyFollowing) {
    // 언팔로우
    const { error } = await supabase
      .from(followTable)
      .delete()
      .eq(followerColumn, user.id)
      .eq(followedColumn, targetUserId)

    if (error) {
      return handleSupabaseError(error, { context: 'follow', logPrefix: '[언팔로우]' })
    }

    if (targetKind === 'member') {
      revalidatePath(`/${targetUserId}`)
    }
    const celebSlug = targetKind === 'celeb' && 'slug' in targetResult.data
      ? targetResult.data.slug
      : null
    if (celebSlug) {
      revalidatePath(`/celeb/${celebSlug}`)
      revalidatePath(`/en/celeb/${celebSlug}`)
    }
    return { success: true, data: { isFollowing: false } }
  }

  // 팔로우
  const { error } = await supabase
    .from(followTable)
    .insert(
      targetKind === 'member'
        ? { follower_member_id: user.id, followed_member_id: targetUserId }
        : { member_id: user.id, celeb_id: targetUserId }
    )

  if (error) {
    return handleSupabaseError(error, { context: 'follow', logPrefix: '[팔로우]' })
  }

  if (targetKind === 'member') {
    revalidatePath(`/${targetUserId}`)
  }
  const celebSlug = targetKind === 'celeb' && 'slug' in targetResult.data
    ? targetResult.data.slug
    : null
  if (celebSlug) {
    revalidatePath(`/celeb/${celebSlug}`)
    revalidatePath(`/en/celeb/${celebSlug}`)
  }
  return { success: true, data: { isFollowing: true } }
}
