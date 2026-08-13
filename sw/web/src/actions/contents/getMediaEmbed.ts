'use server'

import { unstable_cache } from 'next/cache'
import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { STATIC_REVALIDATE } from '@/lib/cache'
import type { ContentType } from '@/types/database'
import { createStaticClient } from '@/lib/supabase/static'
import { getVideoTrailer } from '@feelandnote/content-search/tmdb'
import { getGameTrailer } from '@feelandnote/content-search/igdb'
import { getPreviewUrl } from '@feelandnote/content-search/itunes-music'

export type SpotifyEntityType = 'track' | 'album'

export type MediaEmbedResult = {
  embedType: 'itunes' | 'spotify' | 'youtube' | null
  embedId: string | null
  /** itunes일 때만: 30초 미리듣기 음원 주소 (플레이어가 직접 재생) */
  previewUrl?: string | null
  spotifyEntity?: SpotifyEntityType
}

/**
 * 음악 재생원 판별.
 *
 * 아이튠즈로 옮긴 곡은 미리듣기 음원을 직접 재생한다.
 * 아직 안 옮긴 Spotify 곡은 기존 임베드로 넘긴다(전환기 폴백).
 *
 * ⚠️ 곡/앨범 판별에 Spotify API를 쓰던 코드를 걷어냈다. 그 API가 26.08.01 막히면서
 *    판별이 전부 실패해 앨범까지 track으로 임베드됐고, 그러면 플레이어가 뜨지 않는다.
 *    이제는 DB에 남은 메타로 판별하고, 모르면 album으로 둔다(album URL은 곡 하나짜리도 정상 표시).
 */
async function resolveMusic(
  externalId: string,
  metadata: Record<string, unknown> | null
): Promise<MediaEmbedResult> {
  const none: MediaEmbedResult = { embedType: null, embedId: null }

  if (/^itunes[-_]/.test(externalId)) {
    const storedPreviewUrl = typeof metadata?.previewUrl === 'string' && metadata.previewUrl.length > 0
      ? metadata.previewUrl
      : null
    if (storedPreviewUrl) {
      return { embedType: 'itunes', embedId: externalId, previewUrl: storedPreviewUrl }
    }
    const previewUrl = await getPreviewUrl(externalId).catch(() => null)
    return { embedType: 'itunes', embedId: externalId, previewUrl }
  }

  const spotifyId = externalId.replace(/^spotify[-_]/, '')
  if (spotifyId === externalId) return none

  // DB 메타에 남은 흔적으로 판별한다. 값이 제각각이라 여러 키를 훑는다.
  const raw = metadata ?? {}
  const hint = String(
    raw.entityType ?? raw.type ?? raw.albumType ?? raw.album_type ?? ''
  ).toLowerCase()
  const entity: SpotifyEntityType = hint === 'track' || hint === 'song' ? 'track' : 'album'

  return { embedType: 'spotify', embedId: spotifyId, spotifyEntity: entity }
}

async function fetchMediaEmbed(
  contentId: string,
  type: ContentType
): Promise<MediaEmbedResult> {
  const none: MediaEmbedResult = { embedType: null, embedId: null }

  const supabase = createStaticClient()
  const { data } = await supabase
    .from('contents')
    .select('external_id, metadata')
    .eq('id', contentId)
    .single()

  const externalId = data?.external_id
  if (!externalId) return none

  if (type === 'MUSIC') {
    return resolveMusic(externalId, data?.metadata as Record<string, unknown> | null)
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

// DB 조회 + 외부 API(trailer/preview) 결과를 함께 캐시한다
const getCachedMediaEmbed = unstable_cache(
  fetchMediaEmbed,
  ['media-embed'],
  { revalidate: STATIC_REVALIDATE, tags: [CACHE_TAGS.CONTENTS] }
)

export async function getMediaEmbed(
  contentId: string,
  type: ContentType
): Promise<MediaEmbedResult> {
  return getCachedMediaEmbed(contentId, type)
}
