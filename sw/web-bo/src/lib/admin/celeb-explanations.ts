import 'server-only'

import { requireAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/db/admin'

export interface CelebExplanation {
  profile_id: string
  plain_text: string
  plain_text_en: string | null
  published_at: string | null
  created_at: string
  updated_at: string
}

export async function getCelebExplanation(profileId: string): Promise<CelebExplanation | null> {
  await requireAdmin()

  const db = createAdminClient()
  const { data: explanation, error: explanationError } = await db
    .from('celeb_explanations')
    .select(`
      profile_id,
      plain_text,
      plain_text_en,
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
