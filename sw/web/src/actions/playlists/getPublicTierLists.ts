'use server'

import { createClient } from '@/lib/supabase/server'
import type { PlaylistSummary } from './getPlaylists'

// 공개 티어리스트 조회 (비로그인 사용자도 접근 가능)
export async function getPublicTierLists(): Promise<PlaylistSummary[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('playlists')
    .select(`
      *,
      playlist_items(count)
    `)
    .eq('is_public', true)
    .eq('has_tiers', true)
    .order('updated_at', { ascending: false })
    .limit(50)

  if (error) {
    console.error('공개 티어리스트 조회 에러:', error)
    return []
  }

  return (data || []).map((playlist) => ({
    ...playlist,
    item_count: playlist.playlist_items?.[0]?.count || 0
  }))
}
