'use server'

import type { ContentType } from '@/types/database'
import { getVideoTrailer } from '@feelandnote/content-search/tmdb'
import { getGameTrailer } from '@feelandnote/content-search/igdb'
import { getSpotifyEntityType } from '@feelandnote/content-search/spotify'

export type SpotifyEntityType = 'track' | 'album'

export type MediaEmbedResult = {
  embedType: 'spotify' | 'youtube' | null
  embedId: string | null
  spotifyEntity?: SpotifyEntityType
}

export async function getMediaEmbed(
  contentId: string,
  type: ContentType
): Promise<MediaEmbedResult> {
  const none: MediaEmbedResult = { embedType: null, embedId: null }

  if (type === 'MUSIC') {
    // spotify-xxx, spotify_xxx 모두 지원
    const spotifyId = contentId.replace(/^spotify[-_]/, '')
    if (spotifyId === contentId) return none

    // API 실패 시 track으로 fallback (DB 내 대다수가 track)
    const entity = await getSpotifyEntityType(spotifyId).catch(() => null) ?? 'track'
    return { embedType: 'spotify', embedId: spotifyId, spotifyEntity: entity }
  }

  if (type === 'VIDEO') {
    const key = await getVideoTrailer(contentId)
    return key ? { embedType: 'youtube', embedId: key } : none
  }

  if (type === 'GAME') {
    const key = await getGameTrailer(contentId)
    return key ? { embedType: 'youtube', embedId: key } : none
  }

  return none
}
