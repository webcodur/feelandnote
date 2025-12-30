'use server'

import { createClient } from '@/lib/supabase/server'

export interface UserProfile {
  id: string
  email: string | null
  nickname: string
  avatar_url: string | null
  bio?: string | null
  gemini_api_key: string | null
}

export async function getProfile(): Promise<UserProfile | null> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return null
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
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
    gemini_api_key: profile.gemini_api_key || null
  }
}
