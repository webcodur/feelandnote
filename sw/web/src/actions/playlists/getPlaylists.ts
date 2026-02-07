'use server'

import { createClient } from '@/lib/supabase/server'
import type { Playlist } from '@/types/database'

export interface PlaylistSummary extends Playlist {
  item_count: number
  items?: { content: { thumbnail_url: string | null } }[]
}

export async function getPlaylists(targetUserId?: string): Promise<PlaylistSummary[]> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  // 본인 조회 시 로그인 필수
  const userId = targetUserId || user?.id
  if (!userId) {
    throw new Error('로그인이 필요합니다')
  }

  const isOwner = user?.id === userId

  // 재생목록 + 아이템 개수 + 첫 번째 아이템(썸네일용) 조회
  let query = supabase
    .from('playlists')
    .select(`
      *,
      playlist_items(count),
      items:playlist_items(
        content:contents(thumbnail_url)
      )
    `)
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })

  // 타인 조회 시 공개 플레이리스트만
  if (!isOwner) {
    query = query.eq('is_public', true)
  }

  const { data, error } = await query

  if (error) {
    console.error('재생목록 조회 에러:', error)
    throw new Error('재생목록을 불러오는데 실패했습니다')
  }

  // items는 배열로 오므로, 필요한 형태로 가공 (여기서는 첫 번째 아이템의 썸네일만 필요하지만 구조상 배열 유지)
  return (data || []).map((playlist: any) => ({
    ...playlist,
    item_count: playlist.playlist_items?.[0]?.count || 0,
    items: playlist.items?.slice(0, 1) || [] // 썸네일용으로 첫 번째 아이템만 남김 (쿼리에서 limit을 못 쓰는 경우 대비)
  }))
}
