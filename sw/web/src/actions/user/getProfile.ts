'use server'

import { cache } from 'react'
import { createClient } from '@/lib/db/server'
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
  const db = await createClient()

  const { data: { user } } = await db.auth.getUser()
  if (!user) {
    return null
  }

  // 이메일은 계정 기록(user_accounts)에 있다(26.08.07 분리). 로그인 세션의 값을 그대로 쓴다.
  const { data: profile, error } = await db
    .from('member_profiles')
    .select('id, nickname, avatar_url, bio, birth_date, nationality, selected_title')
    .eq('id', user.id)
    .single()

  if (error || !profile) {
    return null
  }

  return {
    id: profile.id,
    email: user.email ?? null,
    nickname: profile.nickname || 'User',
    avatar_url: profile.avatar_url,
    bio: profile.bio || null,
    birth_date: profile.birth_date || null,
    nationality: profile.nationality || null,
    selected_title: getTitleInfo(profile.selected_title),
  }
}
