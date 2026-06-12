'use server'

import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { getTitleInfo } from '@/constants/titles'

export interface UserProfile {
  id: string
  email: string | null
  nickname: string
  avatar_url: string | null
  bio?: string | null
  birth_date: string | null
  nationality: string | null
  selected_title: { name: string; grade: string } | null
}

// egress-allow: 본인 가변 데이터 — 캐시 부적합 (프로필 수정 직후 즉시 갱신 필요, React.cache는 요청 내 dedup만 수행)
export const getProfile = cache(getProfileInner)

async function getProfileInner(): Promise<UserProfile | null> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return null
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, email, nickname, avatar_url, bio, birth_date, nationality, selected_title')
    .eq('id', user.id)
    .single()

  if (error || !profile) {
    return null
  }

  return {
    id: profile.id,
    email: profile.email,
    nickname: profile.nickname || 'User',
    avatar_url: profile.avatar_url,
    bio: profile.bio || null,
    birth_date: profile.birth_date || null,
    nationality: profile.nationality || null,
    selected_title: getTitleInfo(profile.selected_title),
  }
}
