'use server'

import { createClient } from '@/lib/supabase/server'
import { batchGetSpotifyEntityTypes } from '@feelandnote/content-search/spotify'
import type { ContentStatus } from '@/types/database'
import { getLocale } from 'next-intl/server'
import { CL_SELECT_LIST, flattenLocales, type ContentLocaleRow } from '@/lib/utils/content-locale'

export type SpotifyEntity = 'track' | 'album'

export interface MusicTrack {
  id: string
  externalId: string
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

  // egress-allow: 본인 음악 목록 — 추가/삭제 즉시 반영 필요, 캐시 부적합 (경량 select 적용)
  const { data, error } = await supabase
    .from('user_contents')
    .select(`id, status, content:contents!inner(id, external_id, content_locales(${CL_SELECT_LIST}))`)
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
    const c = item.content as unknown as { external_id: string }
    return (c.external_id || '').replace(/^spotify[-_]/, '')
  })
  const entityMap = await batchGetSpotifyEntityTypes(spotifyIds)

  const locale = await getLocale()
  return items.map((item, idx) => {
    const c = item.content as unknown as {
      id: string; external_id: string; content_locales: ContentLocaleRow[] | null
    }
    const flat = flattenLocales(c.content_locales, locale)
    return {
      id: c.id,
      externalId: c.external_id || '',
      userContentId: item.id as string,
      title: flat.title,
      creator: flat.creator,
      thumbnailUrl: flat.thumbnail_url,
      status: item.status as ContentStatus,
      spotifyEntity: entityMap.get(spotifyIds[idx]) ?? 'album',
    }
  })
}
