'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { ContentType } from '@/types/database'
import { type ActionResult, failure, success, handleSupabaseError } from '@/lib/errors'

interface UpdatePlaylistParams {
  playlistId: string
  name?: string
  description?: string
  coverUrl?: string | null
  contentType?: ContentType | null
  isPublic?: boolean
  hasTiers?: boolean
  tiers?: Record<string, string[]>
}

export async function updatePlaylist(params: UpdatePlaylistParams): Promise<ActionResult<null>> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return failure('UNAUTHORIZED')
  }

  // 소유권 확인
  const { data: playlist } = await supabase
    .from('playlists')
    .select('user_id')
    .eq('id', params.playlistId)
    .single()

  if (!playlist || playlist.user_id !== user.id) {
    return failure('FORBIDDEN')
  }

  // 업데이트할 필드 구성
  const updateData: Record<string, unknown> = {}

  if (params.name !== undefined) {
    if (!params.name.trim()) {
      return failure('VALIDATION_ERROR', '재생목록 이름을 입력해달라.')
    }
    updateData.name = params.name.trim()
  }
  if (params.description !== undefined) updateData.description = params.description?.trim() || null
  if (params.coverUrl !== undefined) updateData.cover_url = params.coverUrl
  if (params.contentType !== undefined) updateData.content_type = params.contentType
  if (params.isPublic !== undefined) updateData.is_public = params.isPublic
  if (params.hasTiers !== undefined) updateData.has_tiers = params.hasTiers
  if (params.tiers !== undefined) updateData.tiers = params.tiers

  const { error } = await supabase
    .from('playlists')
    .update(updateData)
    .eq('id', params.playlistId)

  if (error) {
    return handleSupabaseError(error, { context: 'playlist', logPrefix: '[재생목록 수정]' })
  }

  revalidatePath('/archive')
  revalidatePath(`/archive/playlists/${params.playlistId}`)

  return success(null)
}
