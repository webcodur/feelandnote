'use server'

import { createClient } from '@/lib/supabase/server'
import type { FeedbackWithDetails } from '@/types/database'

export async function getFeedback(id: string) {
  const supabase = await createClient()

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
    console.error('[피드백 상세] Error:', error)
    return null
  }

  return data as FeedbackWithDetails
}
