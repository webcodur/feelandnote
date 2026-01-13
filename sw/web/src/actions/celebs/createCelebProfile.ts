'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { v4 as uuidv4 } from 'uuid'

interface CreateCelebProfileParams {
  nickname: string
  bio?: string
  profession?: string
  avatarUrl?: string
}

export async function createCelebProfile(params: CreateCelebProfileParams) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('로그인이 필요합니다')
  }

  // TODO: 관리자 권한 체크 추가 필요

  const celebId = uuidv4()

  const { data, error } = await supabase
    .from('profiles')
    .insert({
      id: celebId,
      nickname: params.nickname,
      bio: params.bio ?? null,
      profession: params.profession ?? null,
      avatar_url: params.avatarUrl ?? null,
      profile_type: 'CELEB',
      is_verified: false,
      email: null
    })
    .select()
    .single()

  if (error) {
    console.error('Create celeb profile error:', error)
    throw new Error('셀럽 프로필 생성에 실패했습니다')
  }

  revalidatePath('/celebs')

  return data
}
