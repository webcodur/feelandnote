'use server'

import { createClient } from '@/lib/supabase/server'
import type { ContentStatus } from '@/types/database'
import { getLocale } from 'next-intl/server'
import { CL_SELECT_LIST, flattenLocales, type ContentLocaleRow } from '@/lib/utils/content-locale'

type SpotifyEntity = 'track' | 'album'

export interface MusicTrack {
  id: string
  externalId: string
  userContentId: string
  title: string
  creator: string | null
  thumbnailUrl: string | null
  status: ContentStatus
  /** itunes = 우리 플레이어가 미리듣기 음원을 직접 재생, spotify = 기존 임베드(전환기) */
  source: 'itunes' | 'spotify'
  /** itunes일 때만 채워진다 */
  previewUrl: string | null
  spotifyEntity: SpotifyEntity
}

/**
 * 곡/앨범 판별.
 *
 * 예전에는 Spotify API로 한 번에 물어봤는데 그 API가 26.08.01 막혔다(개발자 모드 정책 변경).
 * 판별에 실패하면 전부 track으로 떨어졌고, 앨범을 track으로 임베드하면 플레이어가 뜨지 않는다.
 * 이제 DB에 남은 메타로 판별하고, 모르면 album으로 둔다(album 주소는 곡 하나짜리도 정상 표시).
 */
function entityFromMetadata(metadata: Record<string, unknown> | null): SpotifyEntity {
  const raw = metadata ?? {}
  const hint = String(
    raw.entityType ?? raw.type ?? raw.albumType ?? raw.album_type ?? ''
  ).toLowerCase()
  return hint === 'track' || hint === 'song' ? 'track' : 'album'
}

// 플레이어 전용 경량 음악 목록 조회 (status + 재생원 포함)
export async function getMyMusicList(): Promise<MusicTrack[]> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  // egress-allow: 본인 음악 목록 — 추가/삭제 즉시 반영 필요, 캐시 부적합 (경량 select 적용)
  const { data, error } = await supabase
    .from('user_contents')
    .select(`id, status, content:contents!inner(id, external_id, metadata, content_locales(${CL_SELECT_LIST}))`)
    .eq('user_id', user.id)
    .eq('content.type', 'MUSIC')
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
      external_id: string
      metadata: Record<string, unknown> | null
      content_locales: ContentLocaleRow[] | null
    }
    const flat = flattenLocales(c.content_locales, locale)
    const externalId = c.external_id || ''
    const isItunes = /^itunes[-_]/.test(externalId)

    return {
      id: c.id,
      externalId,
      userContentId: item.id as string,
      title: flat.title,
      creator: flat.creator,
      thumbnailUrl: flat.thumbnail_url,
      status: item.status as ContentStatus,
      source: isItunes ? ('itunes' as const) : ('spotify' as const),
      previewUrl: isItunes ? ((c.metadata?.previewUrl as string | undefined) ?? null) : null,
      spotifyEntity: entityFromMetadata(c.metadata),
    }
  })
}
