'use server'

import { unstable_cache } from 'next/cache'
import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { LISTING_DEFAULT_TIERS } from '@feelandnote/shared/constants/celeb-tiers'
import { createStaticClient } from '@/lib/supabase/static'
import { STATIC_REVALIDATE } from '@/lib/cache'
import { CELEB_PROFESSIONS } from '@/constants/celebProfessions'

export type ProfessionCounts = Record<string, number>

async function fetchProfessionCounts(): Promise<ProfessionCounts> {
  const supabase = createStaticClient()

  // 전체 셀럽 수 — 목록 노출 등급만 센다(목록과 수치 기준 일치)
  const { count: totalCount } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('profile_type', 'CELEB')
    .eq('status', 'active')
    .in('celeb_tier', [...LISTING_DEFAULT_TIERS])

  const counts: ProfessionCounts = {
    all: totalCount ?? 0,
  }

  // 각 직군별 카운트 조회
  const professionValues = CELEB_PROFESSIONS.map(p => p.value)

  const { data } = await supabase
    .from('profiles')
    .select('profession')
    .eq('profile_type', 'CELEB')
    .eq('status', 'active')
    .in('celeb_tier', [...LISTING_DEFAULT_TIERS])
    .in('profession', professionValues)

  // 직군별로 그룹핑
  if (data) {
    for (const row of data) {
      if (row.profession) {
        counts[row.profession] = (counts[row.profession] ?? 0) + 1
      }
    }
  }

  // 데이터 없는 직군은 0으로 초기화
  for (const prof of professionValues) {
    if (!(prof in counts)) {
      counts[prof] = 0
    }
  }

  return counts
}

export const getProfessionCounts = unstable_cache(
  fetchProfessionCounts,
  ['profession-counts'],
  { revalidate: STATIC_REVALIDATE, tags: [CACHE_TAGS.CELEBS] }
)
