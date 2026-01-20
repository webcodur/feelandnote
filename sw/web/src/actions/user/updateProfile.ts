'use server'

import { createClient } from '@/lib/supabase/server'
import { type ActionResult, failure, success, handleSupabaseError } from '@/lib/errors'

export interface UpdateProfileInput {
  nickname?: string
  bio?: string
  avatar_url?: string
  birth_date?: string | null
  nationality?: string | null
  quotes?: string | null
}

export async function updateProfile(input: UpdateProfileInput): Promise<ActionResult<null>> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return failure('UNAUTHORIZED')
  }

  // 닉네임 유효성 검사
  if (input.nickname !== undefined) {
    const trimmedNickname = input.nickname.trim()
    if (trimmedNickname.length < 2 || trimmedNickname.length > 20) {
      return failure('VALIDATION_ERROR', '닉네임은 2~20자 사이여야 한다.')
    }
  }

  // 소개글 유효성 검사
  if (input.bio !== undefined && input.bio.length > 200) {
    return failure('VALIDATION_ERROR', '소개글은 200자 이내여야 한다.')
  }

  // 좌우명 유효성 검사
  if (input.quotes !== undefined && input.quotes && input.quotes.length > 100) {
    return failure('VALIDATION_ERROR', '좌우명은 100자 이내여야 한다.')
  }

  // 생년월일 형식 검사 (YYYY-MM-DD)
  if (input.birth_date !== undefined && input.birth_date) {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(input.birth_date)) {
      return failure('VALIDATION_ERROR', '생년월일 형식이 올바르지 않다. (YYYY-MM-DD)')
    }
  }

  const updateData: Record<string, string | null> = {}
  if (input.nickname !== undefined) updateData.nickname = input.nickname.trim()
  if (input.bio !== undefined) updateData.bio = input.bio || null
  if (input.avatar_url !== undefined) updateData.avatar_url = input.avatar_url || null
  if (input.birth_date !== undefined) updateData.birth_date = input.birth_date || null
  if (input.nationality !== undefined) updateData.nationality = input.nationality || null
  if (input.quotes !== undefined) updateData.quotes = input.quotes || null

  const { error } = await supabase
    .from('profiles')
    .update(updateData)
    .eq('id', user.id)

  if (error) {
    return handleSupabaseError(error, { logPrefix: '[프로필 수정]' })
  }

  return success(null)
}
