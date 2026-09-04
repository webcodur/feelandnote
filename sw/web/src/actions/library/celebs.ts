'use server'

import { unstable_cache } from 'next/cache'
import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { LISTING_DEFAULT_REALITIES } from '@feelandnote/shared/constants/celeb-tiers'
import { STATIC_REVALIDATE, throwOnQueryError, withQueryFallback } from '@/lib/cache'
import { createStaticClient } from '@/lib/db/static'

interface CelebInfo {
  id: string
  nickname: string
  nickname_en: string | null
  avatar_url: string | null
  profession: string | null
}

// #region 콘텐츠를 감상한 셀럽 목록
async function fetchCelebsForContent(contentId: string): Promise<CelebInfo[]> {
  const db = createStaticClient()

  const { data: celebContents, error: ucError } = await db
    .from('celeb_contents')
    .select('celeb_id')
    .eq('content_id', contentId)
    .eq('status', 'FINISHED')

  throwOnQueryError('getCelebsForContent 감상 조회', ucError)
  if (!celebContents?.length) return []

  const celebIds = celebContents.map(row => row.celeb_id)

  const { data: celebs, error: profileError } = await db
    .from('celebs')
    .select('id, nickname, nickname_en, avatar_url, profession')
    .in('id', celebIds)
    .eq('publication_status', 'active')
    // 신화·관계 인물은 목록에서 제외
    .in('celeb_reality', [...LISTING_DEFAULT_REALITIES])

  throwOnQueryError('getCelebsForContent 프로필 조회', profileError)

  return (celebs || []).map(p => ({
    id: p.id,
    nickname: p.nickname,
    nickname_en: p.nickname_en,
    avatar_url: p.avatar_url,
    profession: p.profession
  }))
}

const getCelebsForContentCached = unstable_cache(
  fetchCelebsForContent,
  ['celebs-for-content'],
  { revalidate: STATIC_REVALIDATE, tags: [CACHE_TAGS.CELEBS, CACHE_TAGS.CONTENTS] }
)

export async function getCelebsForContent(contentId: string): Promise<CelebInfo[]> {
  return withQueryFallback('getCelebsForContent', () => getCelebsForContentCached(contentId), [])
}
// #endregion
