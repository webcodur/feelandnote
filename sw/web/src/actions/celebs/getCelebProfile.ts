'use server'

import { createClient } from '@/lib/supabase/server'
import type { Profile } from '@/types/database'

interface CelebProfileWithStats extends Profile {
  stats: {
    content_count: number
    record_count: number
    contributor_count: number
  }
}

export async function getCelebProfile(celebId: string): Promise<CelebProfileWithStats | null> {
  const supabase = await createClient()

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', celebId)
    .eq('profile_type', 'CELEB')
    .eq('status', 'active')
    .single()

  if (error || !profile) {
    return null
  }

  // 콘텐츠 수
  const { count: contentCount } = await supabase
    .from('user_contents')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', celebId)

  // 기록 수
  const { count: recordCount } = await supabase
    .from('records')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', celebId)

  // 기여자 수 (distinct contributor_id)
  const { data: contributors } = await supabase
    .from('records')
    .select('contributor_id')
    .eq('user_id', celebId)
    .not('contributor_id', 'is', null)

  const uniqueContributors = new Set(contributors?.map(c => c.contributor_id) ?? [])

  return {
    ...profile,
    stats: {
      content_count: contentCount ?? 0,
      record_count: recordCount ?? 0,
      contributor_count: uniqueContributors.size
    }
  }
}
