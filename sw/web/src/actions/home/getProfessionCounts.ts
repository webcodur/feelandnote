'use server'

import { createClient } from '@/lib/supabase/server'
import { CELEB_PROFESSIONS } from '@/constants/celebProfessions'

export type ProfessionCounts = Record<string, number>

export async function getProfessionCounts(): Promise<ProfessionCounts> {
  const supabase = await createClient()

  // 전체 셀럽 수
  const { count: totalCount } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('profile_type', 'CELEB')
    .eq('status', 'active')

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
