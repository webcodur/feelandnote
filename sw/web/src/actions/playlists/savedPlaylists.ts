'use server'

import { createClient } from '@/lib/supabase/server'
import type { SavedPlaylistWithDetails, Playlist, PlaylistOwner } from '@/types/database'

interface SavedPlaylistQueryResult {
  id: string
  saved_at: string
  playlist: Playlist & {
    playlist_items: { count: number }[]
    owner: PlaylistOwner
  }
}

// 플레이리스트 저장
export async function savePlaylist(playlistId: string): Promise<void> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('로그인이 필요합니다')

  // 공개 플레이리스트인지 확인
  const { data: playlist, error: playlistError } = await supabase
    .from('playlists')
    .select('user_id, is_public')
    .eq('id', playlistId)
    .single()

  if (playlistError || !playlist) throw new Error('플레이리스트를 찾을 수 없습니다')
  if (playlist.user_id === user.id) throw new Error('본인의 플레이리스트는 저장할 수 없습니다')
  if (!playlist.is_public) throw new Error('비공개 플레이리스트입니다')

  // 저장
  const { error } = await supabase
    .from('saved_playlists')
    .upsert({ user_id: user.id, playlist_id: playlistId }, { onConflict: 'user_id,playlist_id' })

  if (error) {
    console.error('플레이리스트 저장 실패:', error)
    throw new Error('저장에 실패했습니다')
  }
}

// 플레이리스트 저장 해제
export async function unsavePlaylist(playlistId: string): Promise<void> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('로그인이 필요합니다')

  const { error } = await supabase
    .from('saved_playlists')
    .delete()
    .eq('user_id', user.id)
    .eq('playlist_id', playlistId)

  if (error) {
    console.error('저장 해제 실패:', error)
    throw new Error('저장 해제에 실패했습니다')
  }
}

// 저장된 플레이리스트 목록 조회
export async function getSavedPlaylists(): Promise<SavedPlaylistWithDetails[]> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('로그인이 필요합니다')

  const { data, error } = await supabase
    .from('saved_playlists')
    .select(`
      id,
      saved_at,
      playlist:playlists(
        *,
        playlist_items(count),
        owner:profiles!playlists_user_id_fkey(id, nickname, avatar_url)
      )
    `)
    .eq('user_id', user.id)
    .order('saved_at', { ascending: false })

  if (error) {
    console.error('저장된 플레이리스트 조회 실패:', error)
    throw new Error('저장된 플레이리스트를 불러오는데 실패했습니다')
  }

  const results = (data || []) as unknown as SavedPlaylistQueryResult[]

  return results
    .filter((item) => item.playlist)
    .map((item): SavedPlaylistWithDetails => ({
      id: item.id,
      saved_at: item.saved_at,
      playlist: {
        ...item.playlist,
        item_count: item.playlist.playlist_items?.[0]?.count || 0,
        owner: item.playlist.owner
      }
    }))
}

// 플레이리스트 저장 여부 확인
export async function checkPlaylistSaved(playlistId: string): Promise<boolean> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { data, error } = await supabase
    .from('saved_playlists')
    .select('id')
    .eq('user_id', user.id)
    .eq('playlist_id', playlistId)
    .maybeSingle()

  if (error) return false
  return !!data
}
