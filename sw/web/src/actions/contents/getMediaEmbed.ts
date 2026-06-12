'use server'

import { unstable_cache } from 'next/cache'
import type { ContentType } from '@/types/database'
import { createStaticClient } from '@/lib/supabase/static'
import { getVideoTrailer } from '@feelandnote/content-search/tmdb'
import { getGameTrailer } from '@feelandnote/content-search/igdb'
import { getSpotifyEntityType } from '@feelandnote/content-search/spotify'

export type SpotifyEntityType = 'track' | 'album'

export type MediaEmbedResult = {
  embedType: 'spotify' | 'youtube' | null
  embedId: string | null
  spotifyEntity?: SpotifyEntityType
}

async function fetchMediaEmbed(
  contentId: string,
  type: ContentType
): Promise<MediaEmbedResult> {
  const none: MediaEmbedResult = { embedType: null, embedId: null }

  // DB에서 external_id 조회
  const supabase = createStaticClient()
  const { data } = await supabase
    .from('contents')
    .select('external_id')
    .eq('id', contentId)
    .single()

  const externalId = data?.external_id
  if (!externalId) return none

  if (type === 'MUSIC') {
    // spotify-xxx, spotify_xxx 모두 지원
    const spotifyId = externalId.replace(/^spotify[-_]/, '')
    if (spotifyId === externalId) return none

    // API 실패 시 track으로 fallback (DB 내 대다수가 track)
    const entity = await getSpotifyEntityType(spotifyId).catch(() => null) ?? 'track'
    return { embedType: 'spotify', embedId: spotifyId, spotifyEntity: entity }
  }

  if (type === 'VIDEO') {
    const key = await getVideoTrailer(externalId)
    return key ? { embedType: 'youtube', embedId: key } : none
  }

  if (type === 'GAME') {
    const key = await getGameTrailer(externalId)
    return key ? { embedType: 'youtube', embedId: key } : none
  }

  return none
}

// DB 조회 + 외부 API(trailer/spotify) 결과를 함께 캐시한다
const getCachedMediaEmbed = unstable_cache(
  fetchMediaEmbed,
  ['media-embed'],
  { revalidate: 3600, tags: ['celebs'] }
)

export async function getMediaEmbed(
  contentId: string,
  type: ContentType
): Promise<MediaEmbedResult> {
  return getCachedMediaEmbed(contentId, type)
}
