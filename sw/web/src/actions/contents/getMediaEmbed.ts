'use server'

import { unstable_cache } from 'next/cache'
import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { NO_ROWS_CODE, STATIC_REVALIDATE, throwOnQueryError } from '@/lib/cache'
import type { ContentType } from '@/types/database'
import { createStaticClient } from '@/lib/db/static'
import { getVideoTrailer } from '@feelandnote/content-search/tmdb'
import { getGameTrailer } from '@feelandnote/content-search/igdb'
import { getTrackById } from '@feelandnote/content-search/itunes-music'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

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

  // id 컬럼은 UUID다. 외부 작품은 외부 식별자가 그대로 들어오므로 두드리지 않는다 —
  // 형식 오류를 아래에서 장애로 던지지 않기 위해서다(getContentBrief와 같은 규칙).
  if (!UUID_PATTERN.test(contentId)) return none

  const db = createStaticClient()
  const { data, error } = await db
    .from('contents')
    .select('external_id, external_source, metadata')
    .eq('id', contentId)
    .single()

  // 「작품 없음」만 통과시키고 그 밖의 실패는 던져 캐시에 남기지 않는다
  throwOnQueryError('매체 재생원 조회', error, { ignoreCodes: [NO_ROWS_CODE] })

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
