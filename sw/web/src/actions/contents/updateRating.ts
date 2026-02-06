'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

interface UpdateRatingParams {
  userContentId: string
  rating: number | null
}

export async function updateUserContentRating({
  userContentId,
  rating,
}: UpdateRatingParams): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  // 별점 검증: 0.5~5, 0.5 단위
  if (rating !== null) {
    if (rating < 0.5 || rating > 5) {
      return { success: false, error: '별점은 0.5~5 사이여야 한다.' }
    }
    if (rating % 0.5 !== 0) {
      return { success: false, error: '별점은 0.5 단위여야 한다.' }
    }
  }

  const { data, error } = await supabase
    .from('user_contents')
    .update({ rating, updated_at: new Date().toISOString() })
    .eq('id', userContentId)
    .select('user_id, content_id')
    .single()

  if (error) {
    console.error('[별점 수정 오류]', error)
    return { success: false, error: error.message }
  }

  revalidatePath(`/${data.user_id}/records`)

  return { success: true }
}
