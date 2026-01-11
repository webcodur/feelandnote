'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface Title {
  id: string
  name: string
  description: string
  category: string
  grade: string
  bonus_score: number
  condition: Record<string, unknown>
  sort_order: number
  unlocked_count?: number
}

export interface TitleWithUsers extends Title {
  users: {
    id: string
    nickname: string | null
    avatar_url: string | null
    unlocked_at: string
  }[]
}

export async function getTitle(titleId: string): Promise<TitleWithUsers | null> {
  const supabase = await createClient()

  const { data: title, error } = await supabase
    .from('titles')
    .select('*')
    .eq('id', titleId)
    .single()

  if (error || !title) return null

  // 이 칭호를 획득한 사용자들
  const { data: userTitles } = await supabase
    .from('user_titles')
    .select(`
      unlocked_at,
      profiles:user_id (id, nickname, avatar_url)
    `)
    .eq('title_id', titleId)
    .order('unlocked_at', { ascending: false })
    .limit(20)

  // 총 획득자 수
  const { count } = await supabase
    .from('user_titles')
    .select('*', { count: 'exact', head: true })
    .eq('title_id', titleId)

  return {
    ...title,
    unlocked_count: count || 0,
    users: (userTitles || []).map(ut => {
      const profiles = ut.profiles as { id: string; nickname: string | null; avatar_url: string | null }[] | { id: string; nickname: string | null; avatar_url: string | null } | null
      const profile = Array.isArray(profiles) ? profiles[0] : profiles
      return {
        id: profile?.id ?? '',
        nickname: profile?.nickname ?? null,
        avatar_url: profile?.avatar_url ?? null,
        unlocked_at: ut.unlocked_at,
      }
    }),
  }
}

export async function createTitle(data: {
  name: string
  description: string
  category: string
  grade: string
  bonus_score: number
  condition: Record<string, unknown>
  sort_order?: number
}): Promise<string> {
  const supabase = await createClient()

  const { data: title, error } = await supabase
    .from('titles')
    .insert(data)
    .select('id')
    .single()

  if (error) throw error

  revalidatePath('/titles')
  return title.id
}

export async function updateTitle(
  titleId: string,
  data: {
    name?: string
    description?: string
    category?: string
    grade?: string
    bonus_score?: number
    condition?: Record<string, unknown>
    sort_order?: number
  }
): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('titles')
    .update(data)
    .eq('id', titleId)

  if (error) throw error

  revalidatePath('/titles')
}

export async function deleteTitle(titleId: string): Promise<void> {
  const supabase = await createClient()

  // 사용자 칭호 연결 삭제
  await supabase.from('user_titles').delete().eq('title_id', titleId)

  const { error } = await supabase
    .from('titles')
    .delete()
    .eq('id', titleId)

  if (error) throw error

  revalidatePath('/titles')
}

export async function grantTitleToUser(titleId: string, userId: string): Promise<void> {
  const supabase = await createClient()

  // 이미 획득했는지 확인
  const { data: existing } = await supabase
    .from('user_titles')
    .select('id')
    .eq('title_id', titleId)
    .eq('user_id', userId)
    .single()

  if (existing) throw new Error('이미 획득한 칭호입니다')

  const { error } = await supabase
    .from('user_titles')
    .insert({
      title_id: titleId,
      user_id: userId,
    })

  if (error) throw error

  revalidatePath('/titles')
}

export async function revokeTitleFromUser(titleId: string, userId: string): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('user_titles')
    .delete()
    .eq('title_id', titleId)
    .eq('user_id', userId)

  if (error) throw error

  revalidatePath('/titles')
}
