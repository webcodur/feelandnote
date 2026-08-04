import 'server-only'

import { requireAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'

export type CelebExplanationReviewStatus = 'ai_reviewed' | 'human_reviewed' | null

export interface CelebExplanation {
  profile_id: string
  plain_text: string
  interpretive_title: string
  interpretive_text: string
  plain_text_en: string | null
  interpretive_title_en: string | null
  interpretive_text_en: string | null
  review_status: CelebExplanationReviewStatus
  published_at: string | null
  created_at: string
  updated_at: string
}

export async function getCelebExplanation(profileId: string): Promise<CelebExplanation | null> {
  await requireAdmin()

  const supabase = createAdminClient()
  const { data: explanation, error: explanationError } = await supabase
    .from('celeb_explanations')
    .select(`
      profile_id,
      plain_text,
      interpretive_title,
      interpretive_text,
      plain_text_en,
      interpretive_title_en,
      interpretive_text_en,
      review_status,
      published_at,
      created_at,
      updated_at
    `)
    .eq('profile_id', profileId)
    .maybeSingle()

  if (explanationError) throw explanationError
  if (!explanation) return null
  return explanation as CelebExplanation
}
