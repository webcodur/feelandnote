'use server'

import { createClient } from '@/lib/supabase/server'

export interface GenderCount {
  value: string  // 'all' | 'male' | 'female'
  label: string  // 한글 표시명
  count: number
}

export type GenderCounts = GenderCount[]

export async function getGenderCounts(): Promise<GenderCounts> {
  const supabase = await createClient()

  // 전체 셀럽 수
  const { count: totalCount } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('profile_type', 'CELEB')
    .eq('status', 'active')

  // 남성 수 (gender = true)
  const { count: maleCount } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('profile_type', 'CELEB')
    .eq('status', 'active')
    .eq('gender', true)

  // 여성 수 (gender = false)
  const { count: femaleCount } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('profile_type', 'CELEB')
    .eq('status', 'active')
    .eq('gender', false)

  // 결과 배열 (전체 → 남성 → 여성)
  return [
    { value: 'all', label: '전체', count: totalCount ?? 0 },
    { value: 'male', label: '남성', count: maleCount ?? 0 },
    { value: 'female', label: '여성', count: femaleCount ?? 0 },
  ]
}
