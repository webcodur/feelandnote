'use server'

import { unstable_cache } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createStaticClient } from '@/lib/supabase/static'
import type { FeedbackWithDetails } from '@/types/database'

async function fetchFeedbackData(id: string): Promise<FeedbackWithDetails | null> {
  const supabase = createStaticClient()

  const { data, error } = await supabase
    .from('feedbacks')
    .select(`
      *,
      author:profiles!author_id(id, nickname, avatar_url),
      resolver:profiles!resolved_by(id, nickname, avatar_url)
    `)
    .eq('id', id)
    .single()

  if (error) {
    if (error.code !== 'PGRST116') {
      console.error('[피드백 상세] Error:', error)
    }
    return null
  }

  return data as FeedbackWithDetails
}

const getFeedbackDataCached = unstable_cache(
  fetchFeedbackData,
  ['feedback-data'],
  // 사용자 의견(feedbacks)이다. BO에 수정 액션이 없어 태그를 두지 않는다.
  { revalidate: 3600 }
)

export async function getFeedback(id: string) {
  // 조회수 증가는 캐시 외부에서 처리
  const supabase = await createClient()
  await supabase.rpc('increment_feedback_view_count', { feedback_id: id })

  return getFeedbackDataCached(id)
}
