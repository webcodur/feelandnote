'use server'

import { createClient } from '@/lib/supabase/server'
import type { Content } from '@/types/database'
import { getLocale } from 'next-intl/server'
import { CL_SELECT, flattenLocales, type ContentLocaleRow } from '@/lib/utils/content-locale'

export interface UserContentWithDetails {
  id: string
  user_id: string
  content_id: string
  status: string
  rating: number | null
  review: string | null
  is_spoiler: boolean | null
  created_at: string
  updated_at: string
  content: Content
  user?: {
    nickname: string | null
    avatar_url: string | null
  } | null
}

export async function getContent(contentId: string): Promise<UserContentWithDetails> {
  const supabase = await createClient()

  const {
    data: { user }
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('로그인이 필요합니다')
  }

  // 사용자의 콘텐츠 상태와 콘텐츠 정보를 조인해서 조회
  const { data, error } = await supabase
    .from('user_contents')
    .select(
      `
      *,
      content:contents(*, content_locales(${CL_SELECT}))
    `
    )
    .eq('user_id', user.id)
    .eq('content_id', contentId)
    .single()

  if (error || !data) {
    throw new Error('콘텐츠를 찾을 수 없습니다')
  }

  const locale = await getLocale()
  const c = data.content as Record<string, unknown>
  const flat = flattenLocales(c?.content_locales as ContentLocaleRow[] | null, locale)
  const result = {
    ...data,
    content: { ...c, ...flat, content_locales: undefined },
  }
  return result as unknown as UserContentWithDetails
}

// 타인의 공개 콘텐츠 조회
export async function getPublicContent(contentId: string, userId: string): Promise<UserContentWithDetails> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('user_contents')
    .select(`
      *,
      content:contents(*, content_locales(${CL_SELECT})),
      user:profiles!user_contents_user_id_fkey(nickname, avatar_url)
    `)
    .eq('user_id', userId)
    .eq('content_id', contentId)
    .eq('visibility', 'public')
    .single()

  if (error || !data) {
    throw new Error('콘텐츠를 찾을 수 없습니다')
  }

  const locale = await getLocale()
  const c = data.content as Record<string, unknown>
  const flat = flattenLocales(c?.content_locales as ContentLocaleRow[] | null, locale)
  const result = {
    ...data,
    content: { ...c, ...flat, content_locales: undefined },
    user: Array.isArray(data.user) ? data.user[0] : data.user,
  }

  return result as unknown as UserContentWithDetails
}
