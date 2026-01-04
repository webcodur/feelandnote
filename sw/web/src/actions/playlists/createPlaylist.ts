'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { ContentType } from '@/types/database'

interface CreatePlaylistParams {
  name: string
  description?: string
  contentType?: ContentType | null  // null = 혼합
  contentIds: string[]  // 포함할 콘텐츠 ID 배열
  isPublic?: boolean
}

export async function createPlaylist(params: CreatePlaylistParams) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('로그인이 필요합니다')
  }

  if (!params.name.trim()) {
    throw new Error('재생목록 이름을 입력해주세요')
  }

  if (params.contentIds.length === 0) {
    throw new Error('최소 1개 이상의 콘텐츠를 선택해주세요')
  }

  // 1. 재생목록 생성
  const { data: playlist, error: playlistError } = await supabase
    .from('playlists')
    .insert({
      user_id: user.id,
      name: params.name.trim(),
      description: params.description?.trim() || null,
      content_type: params.contentType || null,
      is_public: params.isPublic ?? false,
      has_tiers: false,
      tiers: {}
    })
    .select('id')
    .single()

  if (playlistError || !playlist) {
    console.error('재생목록 생성 에러:', playlistError)
    throw new Error('재생목록 생성에 실패했습니다')
  }

  // 2. 아이템 추가
  const items = params.contentIds.map((contentId, index) => ({
    playlist_id: playlist.id,
    content_id: contentId,
    sort_order: index
  }))

  const { error: itemsError } = await supabase
    .from('playlist_items')
    .insert(items)

  if (itemsError) {
    // 롤백: 재생목록 삭제
    await supabase.from('playlists').delete().eq('id', playlist.id)
    console.error('아이템 추가 에러:', itemsError)
    throw new Error('재생목록 생성에 실패했습니다')
  }

  revalidatePath('/archive')

  return { playlistId: playlist.id }
}
