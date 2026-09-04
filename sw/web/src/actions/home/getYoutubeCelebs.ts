'use server'

import { unstable_cache } from 'next/cache'
import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { LISTING_DEFAULT_REALITIES } from '@feelandnote/shared/constants/celeb-tiers'
import { createStaticClient } from '@/lib/db/static'
import { STATIC_REVALIDATE } from '@/lib/cache'

export interface YoutubeVideoEntry {
  videoId: string
  uploadedAt: string
}

export interface YoutubeCeleb {
  slug: string
  nickname: string | null
  nickname_en: string | null
  avatar_url: string | null
  youtube_videos: Record<string, YoutubeVideoEntry>
}

async function fetchYoutubeCelebsPublic(): Promise<YoutubeCeleb[]> {
  const db = createStaticClient()

  const { data, error } = await db
    .from('celebs')
    .select('slug, nickname, nickname_en, avatar_url, youtube_videos')
    .eq('publication_status', 'active')
    // 신화·관계 인물은 목록에서 제외
    .in('celeb_reality', [...LISTING_DEFAULT_REALITIES])
    .not('youtube_videos', 'is', null)
    .neq('youtube_videos', '{}')
    .not('slug', 'is', null)

  if (error) {
    throw new Error(`유튜브 영상 보유 셀럽 조회 실패: ${error.message}`)
  }

  return (data ?? []).filter(
    (row): row is YoutubeCeleb =>
      !!row.slug && !!row.youtube_videos && Object.keys(row.youtube_videos).length > 0
  )
}

const getYoutubeCelebsCached = unstable_cache(
  fetchYoutubeCelebsPublic,
  ['youtube-celebs'],
  { revalidate: STATIC_REVALIDATE, tags: [CACHE_TAGS.CELEBS] }
)

/** 유튜브 영상(서재 탐방)을 보유한 활성 셀럽 목록 */
export async function getYoutubeCelebs(): Promise<YoutubeCeleb[]> {
  return getYoutubeCelebsCached()
}
