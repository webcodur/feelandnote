'use server'

import { createClient } from '@/lib/supabase/server'
import type { PlaylistWithItems, PlaylistItemWithContent } from '@/types/database'

export async function getPlaylist(playlistId: string): Promise<PlaylistWithItems> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('로그인이 필요합니다')
  }

  // 재생목록 기본 정보 조회
  const { data: playlist, error: playlistError } = await supabase
    .from('playlists')
    .select('*')
    .eq('id', playlistId)
    .single()

  if (playlistError || !playlist) {
    throw new Error('재생목록을 찾을 수 없습니다')
  }

  // 본인 것이 아니고 비공개면 접근 불가
  if (playlist.user_id !== user.id && !playlist.is_public) {
    throw new Error('접근 권한이 없습니다')
  }

  // 아이템 + 콘텐츠 조회
  const { data: items, error: itemsError } = await supabase
    .from('playlist_items')
    .select(`
      *,
      content:contents(*)
    `)
    .eq('playlist_id', playlistId)
    .order('sort_order', { ascending: true })

  if (itemsError) {
    console.error('아이템 조회 에러:', itemsError)
    throw new Error('재생목록 아이템을 불러오는데 실패했습니다')
  }

  return {
    ...playlist,
    items: (items || []) as PlaylistItemWithContent[],
    item_count: items?.length || 0
  }
}
