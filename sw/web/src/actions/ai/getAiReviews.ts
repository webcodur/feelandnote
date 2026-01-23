'use server'

import { createClient } from '@/lib/supabase/server'

export interface AiReviewItem {
  id: string
  review: string
  model: string
  created_at: string
  isAi: true
}

interface GetAiReviewsParams {
  contentId: string
  limit?: number
  offset?: number
}

export async function getAiReviews(params: GetAiReviewsParams): Promise<AiReviewItem[]> {
  const supabase = await createClient()

  let query = supabase
    .from('ai_reviews')
    .select('id, review, model, created_at')
    .eq('content_id', params.contentId)
    .order('created_at', { ascending: false })

  if (params.limit) {
    query = query.limit(params.limit)
  }

  if (params.offset) {
    query = query.range(params.offset, params.offset + (params.limit || 20) - 1)
  }

  const { data, error } = await query

  if (error) {
    console.error('Get AI reviews error:', error)
    return []
  }

  return (data || []).map(item => ({
    ...item,
    isAi: true as const,
  }))
}
