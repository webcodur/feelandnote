'use server'

import { createClient } from '@/lib/supabase/server'
import { getCountryNamesMap } from '@/lib/countries'

export interface NationalityCount {
  value: string  // 'all' | 'none' | 국가 코드 (ISO 3166-1 alpha-2)
  label: string  // 한글 표시명
  count: number
}

export type NationalityCounts = NationalityCount[]

export async function getNationalityCounts(): Promise<NationalityCounts> {
  const supabase = await createClient()

  // 전체 셀럽 수
  const { count: totalCount } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('profile_type', 'CELEB')
    .eq('status', 'active')

  // 국적 정보 없는 셀럽 수
  const { count: noNationalityCount } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('profile_type', 'CELEB')
    .eq('status', 'active')
    .is('nationality', null)

  // 모든 국적 데이터 조회
  const { data } = await supabase
    .from('profiles')
    .select('nationality')
    .eq('profile_type', 'CELEB')
    .eq('status', 'active')
    .not('nationality', 'is', null)

  // 국적별로 그룹핑
  const nationalityMap: Record<string, number> = {}
  if (data) {
    for (const row of data) {
      if (row.nationality) {
        nationalityMap[row.nationality] = (nationalityMap[row.nationality] ?? 0) + 1
      }
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
