'use server'

import { createClient } from '@/lib/supabase/server'

export interface UpdateProfileInput {
  nickname?: string
  bio?: string
  avatar_url?: string
}

interface UpdateProfileResult {
  success: boolean
  error?: string
}

export async function updateProfile(input: UpdateProfileInput): Promise<UpdateProfileResult> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: '로그인이 필요하다.' }
  }

  // 닉네임 유효성 검사
  if (input.nickname !== undefined) {
    const trimmedNickname = input.nickname.trim()
    if (trimmedNickname.length < 2 || trimmedNickname.length > 20) {
      return { success: false, error: '닉네임은 2~20자 사이여야 한다.' }
    }
  }

  // 소개글 유효성 검사
  if (input.bio !== undefined && input.bio.length > 200) {
    return { success: false, error: '소개글은 200자 이내여야 한다.' }
  }

  const updateData: Record<string, string | null> = {}
  if (input.nickname !== undefined) updateData.nickname = input.nickname.trim()
  if (input.bio !== undefined) updateData.bio = input.bio || null
  if (input.avatar_url !== undefined) updateData.avatar_url = input.avatar_url || null

  const { error } = await supabase
    .from('profiles')
    .update(updateData)
    .eq('id', user.id)

  if (error) {
    console.error('Profile update error:', error)
    return { success: false, error: '프로필 수정에 실패했다.' }
  }

  return { success: true }
}
