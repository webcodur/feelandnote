'use server'

import { createClient } from '@/lib/supabase/server'

interface PlaylistInfo {
  id: string
  name: string
}

// 특정 content_id가 포함된 사용자의 재생목록 조회
export async function getPlaylistsContainingContent(contentId: string): Promise<PlaylistInfo[]> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('playlist_items')
    .select(`
      playlist:playlists!inner(id, name, user_id)
    `)
    .eq('content_id', contentId)
    .eq('playlists.user_id', user.id)

  if (error) {
    console.error('재생목록 조회 에러:', error)
    return []
  }

  // 중복 제거 및 타입 변환
  const playlistMap = new Map<string, PlaylistInfo>()
  data?.forEach((item) => {
    const playlist = item.playlist as unknown as { id: string; name: string; user_id: string }
    if (playlist && !playlistMap.has(playlist.id)) {
      playlistMap.set(playlist.id, { id: playlist.id, name: playlist.name })
    }
  })

  return Array.from(playlistMap.values())
}

// 여러 content_id가 포함된 재생목록 일괄 조회
export async function getPlaylistsContainingContents(contentIds: string[]): Promise<PlaylistInfo[]> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user || contentIds.length === 0) return []

  const { data, error } = await supabase
    .from('playlist_items')
    .select(`
      playlist:playlists!inner(id, name, user_id)
    `)
    .in('content_id', contentIds)
    .eq('playlists.user_id', user.id)

  if (error) {
    console.error('재생목록 조회 에러:', error)
    return []
  }

  // 중복 제거
  const playlistMap = new Map<string, PlaylistInfo>()
  data?.forEach((item) => {
    const playlist = item.playlist as unknown as { id: string; name: string; user_id: string }
    if (playlist && !playlistMap.has(playlist.id)) {
      playlistMap.set(playlist.id, { id: playlist.id, name: playlist.name })
    }
  })

  return Array.from(playlistMap.values())
}
