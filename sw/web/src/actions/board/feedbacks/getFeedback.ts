'use server'

import { unstable_cache } from 'next/cache'
import { NO_ROWS_CODE, throwOnQueryError, withQueryFallback } from '@/lib/cache'
import { createClient } from '@/lib/supabase/server'
import { createStaticClient } from '@/lib/supabase/static'
import type { FeedbackWithDetails } from '@/types/database'
import type { Locale } from '@/types/locale'
import { attachMemberAuthorAndResolver } from '@/lib/board/memberProfiles'

async function fetchFeedbackData(id: string, locale: Locale): Promise<FeedbackWithDetails | null> {
  const supabase = createStaticClient()

  const { data, error } = await supabase
    .from('feedbacks')
    .select('*')
    .eq('id', id)
    .eq('locale', locale)
    .single()

  // 그 밖의 오류는 던져 캐시에 남기지 않는다.
  throwOnQueryError('[피드백 상세]', error, { ignoreCodes: [NO_ROWS_CODE] })
  // 여기 오는 오류는 "글이 없다" 하나뿐이다.
  if (error?.code === NO_ROWS_CODE) return null

  const feedback = await attachMemberAuthorAndResolver(supabase, data)
  return feedback as FeedbackWithDetails
}

const getFeedbackDataCached = unstable_cache(
  fetchFeedbackData,
  ['feedback-data'],
  { revalidate: 3600, tags: ['feedbacks'] }
)

export async function getFeedback(id: string, locale: Locale, incrementView = true) {
  // 조회수 증가는 캐시 외부에서 처리
  if (incrementView) {
    const supabase = await createClient()
    await supabase.rpc('increment_feedback_view_count', { feedback_id: id })
  }

  return withQueryFallback('getFeedback', () => getFeedbackDataCached(id, locale), null)
}
