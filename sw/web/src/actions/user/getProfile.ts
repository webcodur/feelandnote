'use server'

import { createClient } from '@/lib/supabase/server'

export interface SelectedTitle {
  id: string
  name: string
  grade: string
}

export interface UserProfile {
  id: string
  email: string | null
  nickname: string
  avatar_url: string | null
  bio?: string | null
  birth_date: string | null
  nationality: string | null
  quotes: string | null
  gemini_api_key: string | null
  selected_title: SelectedTitle | null
}

export async function getProfile(): Promise<UserProfile | null> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return null
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select(`
      *,
      selected_title:titles!profiles_selected_title_id_fkey (id, name, grade)
    `)
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
    quotes: profile.quotes || null,
    gemini_api_key: profile.gemini_api_key || null,
    selected_title: profile.selected_title as SelectedTitle | null,
  }
}
