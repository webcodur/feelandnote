'use server'

import { unstable_cache } from 'next/cache'
import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { LISTING_DEFAULT_TIERS } from '@feelandnote/shared/constants/celeb-tiers'
import { STATIC_REVALIDATE } from '@/lib/cache'
import { createStaticClient } from '@/lib/supabase/static'
import { selectAllPages } from '@feelandnote/shared/lib/paginate'
import { getCountryNamesMap } from '@/lib/countries'

interface NationalityCount {
  value: string  // 'all' | 'none' | 국가 코드 (ISO 3166-1 alpha-2)
  label: string  // 한글 표시명
  count: number
}

export type NationalityCounts = NationalityCount[]

async function fetchNationalityCounts(): Promise<NationalityCounts> {
  const supabase = createStaticClient()

  // 전체 셀럽 수 — 목록 노출 등급만 센다(목록과 수치 기준 일치)
  const { count: totalCount } = await supabase
    .from('celebs')
    .select('*', { count: 'exact', head: true })
    .eq('publication_status', 'active')
    .in('celeb_tier', [...LISTING_DEFAULT_TIERS])

  // 국적 정보 없는 셀럽 수
  const { count: noNationalityCount } = await supabase
    .from('celebs')
    .select('*', { count: 'exact', head: true })
    .eq('publication_status', 'active')
    .in('celeb_tier', [...LISTING_DEFAULT_TIERS])
    .is('nationality', null)

  // 모든 국적 데이터 조회 — 1,000행 상한에 걸리므로 나눠 받는다.
  // 자르면 국가별 합이 위 totalCount(head 카운트라 정확)와 어긋나 화면에서 바로 모순이 된다.
  const data = await selectAllPages<{ nationality: string | null }>((from, to) =>
    supabase
      .from('celebs')
      .select('nationality')
      .eq('publication_status', 'active')
      .in('celeb_tier', [...LISTING_DEFAULT_TIERS])
      .not('nationality', 'is', null)
      .order('id')
      .range(from, to)
  )

  // 국적별로 그룹핑
  const nationalityMap: Record<string, number> = {}
  for (const row of data) {
    if (row.nationality) {
      nationalityMap[row.nationality] = (nationalityMap[row.nationality] ?? 0) + 1
    }
  }

  // 결과 배열 생성
  const counts: NationalityCounts = [
    { value: 'all', label: '전체', count: totalCount ?? 0 },
    { value: 'none', label: '국적정보 없음', count: noNationalityCount ?? 0 },
  ]

  // 국가 코드 → 한글명 매핑 조회
  const codes = Object.keys(nationalityMap)
  const namesMap = await getCountryNamesMap(codes)

  // 국가별 카운트를 카운트 내림차순으로 정렬하여 추가
  const sortedNationalities = Object.entries(nationalityMap)
    .sort(([, a], [, b]) => b - a)
    .map(([code, count]) => ({
      value: code,
      label: namesMap[code] || code,
      count,
    }))

  counts.push(...sortedNationalities)

  return counts
}

export const getNationalityCounts = unstable_cache(
  fetchNationalityCounts,
  ['nationality-counts'],
  { revalidate: STATIC_REVALIDATE, tags: [CACHE_TAGS.CELEBS] }
)
