'use server'

import { unstable_cache } from 'next/cache'
import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { LISTING_DEFAULT_REALITIES } from '@feelandnote/shared/constants/celeb-tiers'
import { STATIC_REVALIDATE } from '@/lib/cache'
import { createStaticClient } from '@/lib/db/static'

interface GenderCount {
  value: string  // 'all' | 'male' | 'female'
  label: string  // 한글 표시명
  count: number
}

export type GenderCounts = GenderCount[]

async function fetchGenderCounts(): Promise<GenderCounts> {
  const db = createStaticClient()

  // 병렬 조회 — 목록에 노출되는 실존 축만 센다(목록과 수치 기준 일치)
  const realities = [...LISTING_DEFAULT_REALITIES]
  const [totalResult, maleResult, femaleResult] = await Promise.all([
    db.from('celebs').select('*', { count: 'exact', head: true }).eq('publication_status', 'active').in('celeb_reality', realities),
    db.from('celebs').select('*', { count: 'exact', head: true }).eq('publication_status', 'active').in('celeb_reality', realities).eq('gender', true),
    db.from('celebs').select('*', { count: 'exact', head: true }).eq('publication_status', 'active').in('celeb_reality', realities).eq('gender', false),
  ])

  return [
    { value: 'all', label: '전체', count: totalResult.count ?? 0 },
    { value: 'male', label: '남성', count: maleResult.count ?? 0 },
    { value: 'female', label: '여성', count: femaleResult.count ?? 0 },
  ]
}

export const getGenderCounts = unstable_cache(
  fetchGenderCounts,
  ['gender-counts'],
  { revalidate: STATIC_REVALIDATE, tags: [CACHE_TAGS.CELEBS] }
)
