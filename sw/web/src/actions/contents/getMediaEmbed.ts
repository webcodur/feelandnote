'use server'

import { unstable_cache } from 'next/cache'
import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { STATIC_REVALIDATE } from '@/lib/cache'
import type { ContentType } from '@/types/database'
import { createStaticClient } from '@/lib/supabase/static'
import { getVideoTrailer } from '@feelandnote/content-search/tmdb'
import { getGameTrailer } from '@feelandnote/content-search/igdb'
import { getTrackById } from '@feelandnote/content-search/itunes-music'

export type MediaEmbedResult = {
  embedType: 'appleMusicPreview' | 'youtube' | null
  embedId: string | null
  /** Apple Music일 때만: 30초 미리듣기 음원 주소 (플레이어가 직접 재생) */
  previewUrl?: string | null
  /** Apple Music의 곡·앨범 페이지 */
  appleMusicUrl?: string | null
}

/**
 * 음악 재생원 판별.
 *
 * Apple에서 등록된 음악은 저장된 미리듣기와 링크를 우선 사용하고, 미리듣기가 없을 때만 보충한다.
 */
async function resolveMusic(
  externalId: string,
  metadata: Record<string, unknown> | null
): Promise<MediaEmbedResult> {
  const none: MediaEmbedResult = { embedType: null, embedId: null }

  if (!/^itunes[-_]\d+$/.test(externalId)) return none
  const storedPreviewUrl = typeof metadata?.previewUrl === 'string' && metadata.previewUrl.length > 0
    ? metadata.previewUrl
    : null
  const storedAppleMusicUrl = typeof metadata?.itunesUrl === 'string' && metadata.itunesUrl.length > 0
    ? metadata.itunesUrl
    : null
  if (storedPreviewUrl) {
    return {
      embedType: 'appleMusicPreview',
      embedId: externalId,
      previewUrl: storedPreviewUrl,
      appleMusicUrl: storedAppleMusicUrl,
    }
  }
  const track = await getTrackById(externalId).catch(() => null)
  return {
    embedType: 'appleMusicPreview',
    embedId: externalId,
    previewUrl: track?.metadata.previewUrl ?? null,
    appleMusicUrl: storedAppleMusicUrl || track?.metadata.itunesUrl || null,
  }
}

async function fetchMediaEmbed(
  contentId: string,
  type: ContentType
): Promise<MediaEmbedResult> {
  const none: MediaEmbedResult = { embedType: null, embedId: null }

  const supabase = createStaticClient()
  const { data } = await supabase
    .from('contents')
    .select('external_id, external_source, metadata')
    .eq('id', contentId)
    .single()

  const externalId = data?.external_id
  if (!externalId) return none

  if (type === 'MUSIC') {
    if (data?.external_source !== 'itunes') return none
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
