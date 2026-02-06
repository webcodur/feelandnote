'use server'

import { createClient } from '@/lib/supabase/server'
import { batchGetSpotifyEntityTypes } from '@feelandnote/content-search/spotify'
import type { ContentStatus } from '@/types/database'

export type SpotifyEntity = 'track' | 'album'

export interface MusicTrack {
  id: string
  userContentId: string
  title: string
  creator: string | null
  thumbnailUrl: string | null
  status: ContentStatus
  spotifyEntity: SpotifyEntity
}

// 플레이어 전용 경량 음악 목록 조회 (status + entity type 포함)
export async function getMyMusicList(): Promise<MusicTrack[]> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('user_contents')
    .select('id, status, content:contents!inner(id, title, creator, thumbnail_url)')
    .eq('user_id', user.id)
    .eq('content.type', 'MUSIC')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('음악 목록 조회 에러:', error)
    return []
  }

  const items = (data || []).filter((item) => item.content !== null)

  // Spotify ID 추출 + 배치 엔티티 타입 판별
  const spotifyIds = items.map((item) => {
    const c = item.content as unknown as { id: string }
    return c.id.replace(/^spotify[-_]/, '')
  })
  const entityMap = await batchGetSpotifyEntityTypes(spotifyIds)

  return items.map((item, idx) => {
    const c = item.content as unknown as {
      id: string; title: string; creator: string | null; thumbnail_url: string | null
    }
    return {
      id: c.id,
      userContentId: item.id as string,
      title: c.title,
      creator: c.creator,
      thumbnailUrl: c.thumbnail_url,
      status: item.status as ContentStatus,
      spotifyEntity: entityMap.get(spotifyIds[idx]) ?? 'album',
    }
  })
}
