'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { ContentType } from '@/types/database'
import { type ActionResult, failure, success, handleSupabaseError } from '@/lib/errors'

interface CreatePlaylistParams {
  name: string
  description?: string
  contentType?: ContentType | null  // null = 혼합
  contentIds: string[]  // 포함할 콘텐츠 ID 배열
  isPublic?: boolean
}

interface CreatePlaylistData {
  playlistId: string
}

export async function createPlaylist(params: CreatePlaylistParams): Promise<ActionResult<CreatePlaylistData>> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return failure('UNAUTHORIZED')
  }

  if (!params.name.trim()) {
    return failure('VALIDATION_ERROR', '재생목록 이름을 입력해달라.')
  }

  if (params.contentIds.length === 0) {
    return failure('INVALID_INPUT', '최소 1개 이상의 콘텐츠를 선택해달라.')
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
    return handleSupabaseError(playlistError!, { context: 'playlist', logPrefix: '[재생목록 생성]' })
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
    return handleSupabaseError(itemsError, { context: 'playlist', logPrefix: '[아이템 추가]' })
  }

  revalidatePath('/archive')

  return success({ playlistId: playlist.id })
}
