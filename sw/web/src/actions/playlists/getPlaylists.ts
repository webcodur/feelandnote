'use server'

import { createClient } from '@/lib/supabase/server'
import type { Playlist } from '@/types/database'

export interface PlaylistSummary extends Playlist {
  item_count: number
}

export async function getPlaylists(): Promise<PlaylistSummary[]> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('로그인이 필요합니다')
  }

  // 재생목록 + 아이템 개수 조회
  const { data, error } = await supabase
    .from('playlists')
    .select(`
      *,
      playlist_items(count)
    `)
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })

  if (error) {
    console.error('재생목록 조회 에러:', error)
    throw new Error('재생목록을 불러오는데 실패했습니다')
  }

  return (data || []).map((playlist) => ({
    ...playlist,
    item_count: playlist.playlist_items?.[0]?.count || 0
  }))
}
