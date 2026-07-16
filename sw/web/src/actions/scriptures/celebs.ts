'use server'

import { unstable_cache } from 'next/cache'
import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { LISTING_DEFAULT_TIERS } from '@feelandnote/shared/constants/celeb-tiers'
import { STATIC_REVALIDATE } from '@/lib/cache'
import { createStaticClient } from '@/lib/supabase/static'
import { getLocale } from 'next-intl/server'
import type { TopCeleb } from './types'

interface CelebInfo {
  id: string
  nickname: string
  avatar_url: string | null
  profession: string | null
}

// #region 콘텐츠를 감상한 셀럽 목록
async function fetchCelebsForContent(contentId: string): Promise<CelebInfo[]> {
  const supabase = createStaticClient()

  const { data: userContents, error: ucError } = await supabase
    .from('user_contents')
    .select('user_id')
    .eq('content_id', contentId)
    .eq('status', 'FINISHED')

  if (ucError || !userContents?.length) return []

  const userIds = userContents.map(uc => uc.user_id)

  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('id, nickname, avatar_url, profession')
    .in('id', userIds)
    .eq('profile_type', 'CELEB')
    .eq('status', 'active')
    // 신화·관계 인물은 목록에서 제외
    .in('celeb_tier', [...LISTING_DEFAULT_TIERS])

  if (profileError) {
    console.error('getCelebsForContent error:', profileError)
    return []
  }

  return (profiles || []).map(p => ({
    id: p.id,
    nickname: p.nickname,
    avatar_url: p.avatar_url,
    profession: p.profession
  }))
}

export const getCelebsForContent = unstable_cache(
  fetchCelebsForContent,
  ['celebs-for-content'],
  { revalidate: STATIC_REVALIDATE, tags: [CACHE_TAGS.CELEBS, CACHE_TAGS.CONTENTS] }
)
// #endregion

// #region 전 시대 통합 - 최고 영향력 셀럽 Top 3 (감상 기록 5개 이상)
async function fetchTopCelebsAcrossAllEras(locale: string): Promise<TopCeleb[]> {
  const supabase = createStaticClient()

  const { data, error } = await supabase.rpc('get_top_celebs_across_eras', {
    p_limit: 3,
  })

  if (error || !data?.length) {
    if (error) console.error('getTopCelebsAcrossAllEras error:', error)
    return []
  }

  return (data as Record<string, unknown>[]).map(row => {
    const nicknameKo = row.nickname as string
    const nicknameEn = (row.nickname_en as string) ?? null
    const titleKo = (row.title as string) ?? null
    const titleEn = (row.title_en as string) ?? null
    return {
      id: row.id as string,
      nickname: (locale === 'en' ? nicknameEn || nicknameKo : nicknameKo) || '',
      nickname_en: nicknameEn,
      avatar_url: (row.avatar_url as string) ?? null,
      title: (locale === 'en' ? titleEn || titleKo : titleKo) ?? null,
      title_en: titleEn,
      influence: row.influence ? Number(row.influence) : null,
      count: Number(row.content_count),
    }
  })
}

const getTopCelebsAcrossAllErasCached = unstable_cache(
  fetchTopCelebsAcrossAllEras,
  ['top-celebs-across-eras'],
  { revalidate: STATIC_REVALIDATE, tags: [CACHE_TAGS.CELEBS, CACHE_TAGS.CONTENTS] }
)

export async function getTopCelebsAcrossAllEras(): Promise<TopCeleb[]> {
  const locale = await getLocale()
  return getTopCelebsAcrossAllErasCached(locale)
}
// #endregion
