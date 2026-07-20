'use server'

import { unstable_cache } from 'next/cache'
import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { createStaticClient } from '@/lib/supabase/static'
import { STATIC_REVALIDATE } from '@/lib/cache'

export interface ProfileBrief {
  slug: string
  nickname: string | null
  nickname_en: string | null
  avatar_url: string | null
}

/**
 * slug 목록으로 셀럽 프로필 요약을 조회한다.
 * 홈 「영감의 사슬」처럼 고정 명단을 아바타·이름으로 채울 때 사용한다.
 * RSC 직접 호출은 캐시를 우회하므로 반드시 이 액션을 거친다.
 */
async function fetchProfilesBySlugs(slugs: string[]): Promise<Record<string, ProfileBrief>> {
  if (slugs.length === 0) return {}

  const supabase = createStaticClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('slug, nickname, nickname_en, avatar_url')
    .in('slug', slugs)

  if (error) throw new Error(`getProfilesBySlugs 실패: ${error.message}`)

  const map: Record<string, ProfileBrief> = {}
  for (const row of data ?? []) {
    if (row.slug) map[row.slug] = row as ProfileBrief
  }
  return map
}

export const getProfilesBySlugs = unstable_cache(
  fetchProfilesBySlugs,
  ['profiles-by-slugs'],
  { revalidate: STATIC_REVALIDATE, tags: [CACHE_TAGS.CELEBS] }
)
