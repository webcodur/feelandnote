'use server'

import { createClient } from '@/lib/db/server'
import type { ContentStatus } from '@/types/database'
import { getLocale } from 'next-intl/server'
import { CL_SELECT_LIST, flattenLocales, type ContentLocaleRow } from '@/lib/utils/content-locale'

type MusicEntity = 'track' | 'album'

export interface MusicTrack {
  id: string
  userContentId: string
  title: string
  creator: string | null
  thumbnailUrl: string | null
  status: ContentStatus
  previewUrl: string | null
  appleMusicUrl: string | null
  entity: MusicEntity
}

function entityFromMetadata(metadata: Record<string, unknown> | null): MusicEntity {
  const raw = metadata ?? {}
  const hint = String(
    raw.entityType ?? raw.type ?? raw.albumType ?? raw.album_type ?? ''
  ).toLowerCase()
  return hint === 'track' || hint === 'song' ? 'track' : 'album'
}

// 플레이어 전용 경량 음악 목록 조회 (status + 재생원 포함)
export async function getMyMusicList(): Promise<MusicTrack[]> {
  const db = await createClient()

  const { data: { user } } = await db.auth.getUser()
  if (!user) return []

  // egress-allow: 본인 음악 목록 — 추가/삭제 즉시 반영 필요, 캐시 부적합 (경량 select 적용)
  const { data, error } = await db
    .from('member_contents')
    .select(`id, status, content:contents!inner(id, metadata, content_locales(${CL_SELECT_LIST}))`)
    .eq('member_id', user.id)
    .eq('content.type', 'MUSIC')
    .eq('content.external_source', 'itunes')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('음악 목록 조회 에러:', error)
    return []
  }

  const items = (data || []).filter((item) => item.content !== null)
  const locale = await getLocale()

  return items.map((item) => {
    const c = item.content as unknown as {
      id: string
      metadata: Record<string, unknown> | null
      content_locales: ContentLocaleRow[] | null
    }
    const flat = flattenLocales(c.content_locales, locale)
    return {
      id: c.id,
      userContentId: item.id as string,
      title: flat.title,
      creator: flat.creator,
      thumbnailUrl: flat.thumbnail_url,
      status: item.status as ContentStatus,
      previewUrl: (c.metadata?.previewUrl as string | undefined) ?? null,
      appleMusicUrl: (c.metadata?.itunesUrl as string | undefined) ?? null,
      entity: entityFromMetadata(c.metadata),
    }
  })
}
