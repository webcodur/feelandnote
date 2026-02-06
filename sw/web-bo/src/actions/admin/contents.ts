'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface Content {
  id: string
  type: string
  title: string
  creator: string | null
  thumbnail_url: string | null
  description: string | null
  publisher: string | null
  release_date: string | null
  subtype: string | null
  external_source: string | null
  metadata: Record<string, unknown>
  created_at: string
  user_count: number
}

export interface ContentDetail extends Content {
  users: {
    id: string
    nickname: string | null
    avatar_url: string | null
    status: string
    created_at: string
  }[]
  records: {
    id: string
    type: string
    content: string
    user: { nickname: string | null }
    created_at: string
  }[]
}

export async function getContent(contentId: string): Promise<ContentDetail | null> {
  const supabase = await createClient()

  const { data: content, error } = await supabase
    .from('contents')
    .select('*')
    .eq('id', contentId)
    .single()

  if (error || !content) return null

  // 이 콘텐츠를 등록한 사용자들
  const { data: userContents } = await supabase
    .from('user_contents')
    .select(`
      status,
      created_at,
      profiles:user_id (id, nickname, avatar_url)
    `)
    .eq('content_id', contentId)
    .order('created_at', { ascending: false })
    .limit(10)

  // 이 콘텐츠의 기록들
  const { data: records } = await supabase
    .from('records')
    .select(`
      id,
      type,
      content,
      created_at,
      profiles:user_id (nickname)
    `)
    .eq('content_id', contentId)
    .order('created_at', { ascending: false })
    .limit(10)

  // 총 사용자 수
  const { count: userCount } = await supabase
    .from('user_contents')
    .select('*', { count: 'exact', head: true })
    .eq('content_id', contentId)

  return {
    ...content,
    user_count: userCount || 0,
    users: (userContents || []).map(uc => {
      const profiles = uc.profiles as { id: string; nickname: string | null; avatar_url: string | null }[] | { id: string; nickname: string | null; avatar_url: string | null } | null
      const profile = Array.isArray(profiles) ? profiles[0] : profiles
      return {
        id: profile?.id ?? '',
        nickname: profile?.nickname ?? null,
        avatar_url: profile?.avatar_url ?? null,
        status: uc.status,
        created_at: uc.created_at,
      }
    }),
    records: (records || []).map(r => {
      const profiles = r.profiles as { nickname: string | null }[] | { nickname: string | null } | null
      const profile = Array.isArray(profiles) ? profiles[0] : profiles
      return {
        id: r.id,
        type: r.type,
        content: r.content,
        user: { nickname: profile?.nickname ?? null },
        created_at: r.created_at,
      }
    }),
  }
}

export async function updateContent(
  contentId: string,
  data: {
    title?: string
    creator?: string
    description?: string
    publisher?: string
    release_date?: string
  }
): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('contents')
    .update(data)
    .eq('id', contentId)

  if (error) throw error

  revalidatePath('/contents')
  revalidatePath(`/contents/${contentId}`)
}

export async function deleteContent(contentId: string): Promise<void> {
  const supabase = await createClient()

  // 관련 데이터 삭제 (cascading이 설정되어 있지 않은 경우)
  await supabase.from('user_contents').delete().eq('content_id', contentId)
  await supabase.from('records').delete().eq('content_id', contentId)

  const { error } = await supabase
    .from('contents')
    .delete()
    .eq('id', contentId)

  if (error) throw error

  revalidatePath('/contents')
}
